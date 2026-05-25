import json
from typing import AsyncGenerator

import httpx
from sqlalchemy import func, select, update

from app.common.redis import get_redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.models import Conversation, Message
from app.chat.prompt import build_prompt
from app.common.config import settings
from app.common.exceptions import NotFoundException
from app.knowledge.retriever import hybrid_search

CTX_TURNS = 10


async def _get_context(conv_id: str) -> list[dict]:
    r = get_redis()
    raw = await r.lrange(f"chat:context:{conv_id}", 0, -1)
    return [json.loads(item) for item in reversed(raw)]


async def _push_context(conv_id: str, role: str, content: str) -> None:
    r = get_redis()
    await r.lpush(f"chat:context:{conv_id}", json.dumps({"role": role, "content": content}, ensure_ascii=False))
    await r.ltrim(f"chat:context:{conv_id}", 0, CTX_TURNS * 2 - 1)
    await r.expire(f"chat:context:{conv_id}", 86400)


async def create_conversation(db: AsyncSession, user_id: str, title: str | None = None) -> Conversation:
    conv = Conversation(user_id=user_id, title=title or "新对话")
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def list_conversations(
    db: AsyncSession, user_id: str, page: int = 1, page_size: int = 20
) -> tuple[list[Conversation], int]:
    base = select(Conversation).where(
        Conversation.user_id == user_id, Conversation.deleted_at.is_(None)
    )
    total = 0
    if page == 1:
        total = await db.scalar(
            select(func.count()).select_from(Conversation).where(
                Conversation.user_id == user_id, Conversation.deleted_at.is_(None)
            )
        ) or 0
    result = await db.execute(
        base.order_by(Conversation.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total


async def get_conversation(db: AsyncSession, conv_id: str, user_id: str) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise NotFoundException("对话不存在")
    return conv


async def list_messages(
    db: AsyncSession, conv_id: str, page_size: int = 20, cursor: str | None = None
) -> list[Message]:
    base = select(Message).where(
        Message.conversation_id == conv_id, Message.deleted_at.is_(None)
    )
    if cursor:
        base = base.where(Message.id < cursor)
    result = await db.execute(
        base.order_by(Message.created_at.desc()).limit(page_size)
    )
    return list(result.scalars().all())


async def stream_chat(
    db: AsyncSession,
    conv_id: str,
    user_message: str,
    user_id: str,
) -> AsyncGenerator[str, None]:
    user_msg = Message(conversation_id=conv_id, role="user", content=user_message)
    db.add(user_msg)
    await db.commit()

    # Auto-title on first message
    conv = await db.get(Conversation, conv_id)
    if conv and (conv.title == "新对话" or conv.title is None):
        title = user_message[:30] + ("..." if len(user_message) > 30 else "")
        await db.execute(
            update(Conversation).where(Conversation.id == conv_id).values(title=title)
        )

    # Push to Redis context
    await _push_context(conv_id, "user", user_message)

    # Retrieve relevant chunks
    chunks = await hybrid_search(db, user_message, manual_ids=None, top_k=5)

    if not chunks:
        fallback = "抱歉，您还未上传任何说明书，或者我未在说明书内容中找到相关信息。请先上传说明书后再提问。"
        yield fallback
        assistant_msg = Message(
            conversation_id=conv_id, role="assistant", content=fallback, citations=[]
        )
        db.add(assistant_msg)
        await db.commit()
        await _push_context(conv_id, "assistant", fallback)
        return

    # Build prompt with context
    history = await _get_context(conv_id)
    context_parts = []
    for c in chunks:
        source = c.get("product_name", f"说明书 {c['manual_id'][:8]}")
        page = f" 第{c['page_number']}页" if c.get("page_number") else ""
        context_parts.append(f"[来源：{source}{page}]\n{c['content']}")
    prompt = build_prompt("\n\n".join(context_parts), user_message, history[:-1])  # exclude current

    full_response = ""
    if not settings.llm_api_url:
        # Demo mode: mock response
        import asyncio
        demo = f"根据已上传的说明书内容，关于「{user_message}」的信息如下：\n\n该内容在说明书中已有详细说明。如需进一步了解，请参考说明书相关章节。"
        for char in demo:
            full_response += char
            yield char
            await asyncio.sleep(0.02)
    else:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, read=120.0)) as client:
            async with client.stream(
                "POST",
                settings.llm_api_url,
                json={
                    "model": settings.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                },
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line.removeprefix("data: ")
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0].get("delta", {}).get("content", "")
                            if content:
                                full_response += content
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

    assistant_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=full_response,
        citations=[{
            "id": c["id"],
            "content": c["content"][:100],
            "product_name": c.get("product_name", ""),
            "page_number": c.get("page_number"),
        } for c in chunks],
    )
    db.add(assistant_msg)
    await db.commit()
    await _push_context(conv_id, "assistant", full_response)

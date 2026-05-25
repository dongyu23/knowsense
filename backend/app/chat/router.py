from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func, update

from app.chat.models import Conversation, Message
from app.chat.schemas import ConversationCreate, ConversationResponse, MessageResponse
from app.chat.service import (
    create_conversation,
    get_conversation,
    list_conversations,
    list_messages,
    stream_chat,
)
from app.common.database import get_db
from app.common.dependencies import get_current_user_id
from app.common.schemas import ApiResponse, CursorData, PageData
from app.common.sse import sse_generator

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.post("")
async def create(
    req: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    conv = await create_conversation(db, user_id, req.title)
    return ApiResponse.ok(data=ConversationResponse.model_validate(conv, from_attributes=True).model_dump())


@router.get("")
async def list_all(
    page: int = 1,
    pageSize: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    convs, total = await list_conversations(db, user_id, page, min(pageSize, 100))
    return ApiResponse.ok(
        data=PageData(
            list=[ConversationResponse.model_validate(c, from_attributes=True).model_dump() for c in convs],
            total=total,
            page=page,
            pageSize=pageSize,
        )
    )


@router.delete("/{conv_id}")
async def remove_conv(
    conv_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_conversation(db, conv_id, user_id)
    await db.execute(
        update(Message).where(Message.conversation_id == conv_id).values(deleted_at=func.now())
    )
    conv = await db.get(Conversation, conv_id)
    if conv:
        conv.deleted_at = func.now()
    await db.commit()
    return ApiResponse.ok(message="已删除")


@router.get("/{conv_id}/messages")
async def messages(
    conv_id: str,
    pageSize: int = 20,
    cursor: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_conversation(db, conv_id, user_id)
    msgs = await list_messages(db, conv_id, pageSize, cursor)
    next_cursor = str(msgs[-1].id) if msgs and len(msgs) == pageSize else None
    return ApiResponse.ok(
        data=CursorData(
            list=[MessageResponse.model_validate(m, from_attributes=True).model_dump() for m in msgs],
            nextCursor=next_cursor,
            hasMore=next_cursor is not None,
            pageSize=pageSize,
        )
    )


@router.post("/{conv_id}/messages")
async def send_message(
    conv_id: str,
    message: str = Query(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_conversation(db, conv_id, user_id)
    return StreamingResponse(
        sse_generator("message", stream_chat(db, conv_id, message, user_id)),
        media_type="text/event-stream",
    )

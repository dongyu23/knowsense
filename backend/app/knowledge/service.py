import jieba

from sqlalchemy import func, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.knowledge.models import Chunk


def _segment(text: str) -> str:
    return " ".join(jieba.cut(text))


async def store_chunk(
    db: AsyncSession,
    manual_id: str,
    image_page_id: str | None,
    chunk_index: int,
    content: str,
    embedding: list[float] | None,
    metadata: dict | None = None,
) -> Chunk:
    segmented = _segment(content)
    chunk = Chunk(
        manual_id=manual_id,
        image_page_id=image_page_id,
        chunk_index=chunk_index,
        content=content,
        embedding=embedding,
        chunk_metadata=metadata or {},
    )
    db.add(chunk)
    await db.flush()

    await db.execute(
        text("UPDATE chunk SET search_vector = to_tsvector('simple', :seg) WHERE id = :id"),
        {"seg": segmented, "id": chunk.id},
    )
    await db.commit()
    await db.refresh(chunk)
    return chunk


_SEMANTIC_SQL = """
    SELECT c.id, c.manual_id, c.image_page_id, c.chunk_index,
           c.content, c.metadata, c.created_at,
           m.product_name, ip.page_number,
           1 - (c.embedding <=> :embedding) AS similarity
    FROM chunk c
    LEFT JOIN manual m ON m.id = c.manual_id
    LEFT JOIN image_page ip ON ip.id = c.image_page_id
    WHERE c.deleted_at IS NULL {extra}
    ORDER BY c.embedding <=> :embedding
    LIMIT :top_k
"""

_KEYWORD_SQL = """
    SELECT c.id, c.manual_id, c.image_page_id, c.chunk_index,
           c.content, c.metadata, c.created_at,
           m.product_name, ip.page_number,
           ts_rank(c.search_vector, to_tsquery('simple', :query)) AS rank
    FROM chunk c
    LEFT JOIN manual m ON m.id = c.manual_id
    LEFT JOIN image_page ip ON ip.id = c.image_page_id
    WHERE c.deleted_at IS NULL
      AND c.search_vector @@ to_tsquery('simple', :query) {extra}
    ORDER BY rank DESC
    LIMIT :top_k
"""


async def semantic_search(
    db: AsyncSession,
    query_embedding: list[float],
    manual_ids: list[str] | None = None,
    top_k: int = 5,
) -> list:
    extra = ""
    params: dict = {"embedding": query_embedding, "top_k": top_k}
    if manual_ids:
        extra = "AND c.manual_id = ANY(:manual_ids)"
        params["manual_ids"] = manual_ids
    sql = text(_SEMANTIC_SQL.format(extra=extra))
    result = await db.execute(sql, params)
    return result.fetchall()


async def keyword_search(
    db: AsyncSession,
    query: str,
    manual_ids: list[str] | None = None,
    top_k: int = 5,
) -> list:
    segmented_query = _segment(query)
    or_query = segmented_query.replace(" ", " | ")
    extra = ""
    params: dict = {"query": or_query, "top_k": top_k}
    if manual_ids:
        extra = "AND c.manual_id = ANY(:manual_ids)"
        params["manual_ids"] = manual_ids
    sql = text(_KEYWORD_SQL.format(extra=extra))
    result = await db.execute(sql, params)
    return result.fetchall()


async def delete_chunks_by_manual(db: AsyncSession, manual_id: str) -> None:
    await db.execute(
        update(Chunk).where(Chunk.manual_id == manual_id).values(deleted_at=func.now())
    )
    await db.commit()


async def delete_chunks_by_page(db: AsyncSession, image_page_id: str) -> None:
    await db.execute(
        update(Chunk).where(Chunk.image_page_id == image_page_id).values(deleted_at=func.now())
    )
    await db.commit()

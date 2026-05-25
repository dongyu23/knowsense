from sqlalchemy.ext.asyncio import AsyncSession

from app.knowledge.service import keyword_search, semantic_search


async def hybrid_search(
    db: AsyncSession,
    query_text: str,
    query_embedding: list[float] | None = None,
    manual_ids: list[str] | None = None,
    top_k: int = 5,
) -> list[dict]:
    results = {}

    kw_rows = await keyword_search(db, query_text, manual_ids, top_k * 2)
    for row in kw_rows:
        chunk_id = str(row.id)
        results[chunk_id] = _row_to_dict(row, row.rank * 0.5)

    if query_embedding:
        sem_rows = await semantic_search(db, query_embedding, manual_ids, top_k * 2)
        for row in sem_rows:
            chunk_id = str(row.id)
            sim = row.similarity
            if chunk_id in results:
                results[chunk_id]["score"] += sim * 0.5
            else:
                results[chunk_id] = _row_to_dict(row, sim * 0.5)

    sorted_results = sorted(results.values(), key=lambda x: x["score"], reverse=True)
    return sorted_results[:top_k]


def _row_to_dict(row, score: float) -> dict:
    return {
        "id": str(row.id),
        "content": row.content,
        "manual_id": str(row.manual_id),
        "product_name": getattr(row, "product_name", None) or "未知说明书",
        "page_number": getattr(row, "page_number", None),
        "metadata": row.metadata,
        "score": score,
    }

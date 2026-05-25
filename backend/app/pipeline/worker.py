import asyncio
import json
import logging

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.common.config import settings
from app.manual.service import check_and_update_manual_status, update_page_ocr_result
from app.knowledge.service import store_chunk
from app.pipeline.chunker import chunk_text
from app.pipeline.embedder import embed_texts
from app.pipeline.ocr import ocr_image
from app.storage.service import get_file_url

logger = logging.getLogger("knowsense.worker")


async def _update_progress(r: redis.Redis, task_id: str, status: str, progress: str) -> None:
    await r.hset(f"pipeline:task:{task_id}", mapping={"status": status, "progress": progress})


async def run_worker():
    r = redis.from_url(settings.redis_url)
    db_engine = create_async_engine(settings.database_url, echo=False)
    logger.info("Pipeline Worker started")

    while True:
        result = await r.brpop("pipeline:ocr", timeout=5)
        if result:
            _, task_data = result
            task = json.loads(task_data)
            task_id = task["task_id"]
            manual_id = task["manual_id"]
            page_id = task["page_id"]
            minio_path = task["minio_path"]

            await _update_progress(r, task_id, "ocr_running", "ocr")
            try:
                image_url = await get_file_url(minio_path)
                ocr_text = await ocr_image(image_url)

                async with AsyncSession(db_engine) as db:
                    await update_page_ocr_result(db, page_id, ocr_text, "done")

                chunks = chunk_text(ocr_text)
                await _update_progress(r, task_id, "embedding", f"chunks_{len(chunks)}")

                if chunks:
                    embeddings = await embed_texts(chunks)
                    emb_data = json.dumps({
                        "task_id": task_id,
                        "manual_id": manual_id,
                        "page_id": page_id,
                        "chunks": chunks,
                        "embeddings": embeddings,
                    })
                    await r.lpush("pipeline:embed", emb_data)

                await _update_progress(r, task_id, "done", "done")
                await r.expire(f"pipeline:task:{task_id}", 3600)

            except Exception as e:
                logger.error(f"OCR task {task_id} failed: {e}")
                info = await r.hgetall(f"pipeline:task:{task_id}")
                retries = int(info.get(b"retries", b"0"))
                if retries < 3:
                    await r.hset(f"pipeline:task:{task_id}", mapping={"status": "retry", "retries": str(retries + 1)})
                    await r.lpush("pipeline:ocr", task_data)
                else:
                    await r.rpush("pipeline:dead", task_data)
                    await r.hset(f"pipeline:task:{task_id}", mapping={"status": "failed", "error": str(e)})
                async with AsyncSession(db_engine) as db:
                    await update_page_ocr_result(db, page_id, "", "failed", str(e)[:500])

        embed_result = await r.brpop("pipeline:embed", timeout=1)
        if embed_result:
            _, emb_data = embed_result
            emb = json.loads(emb_data)
            task_id = emb["task_id"]
            manual_id = emb["manual_id"]
            chunks = emb["chunks"]
            embeddings = emb["embeddings"]

            await _update_progress(r, task_id, "storing", "storing")
            try:
                async with AsyncSession(db_engine) as db:
                    for i, (chunk, vec) in enumerate(zip(chunks, embeddings)):
                        await store_chunk(
                            db, manual_id, emb.get("page_id"), i, chunk, vec
                        )
                    await db.commit()
                    await check_and_update_manual_status(db, manual_id)
                await _update_progress(r, task_id, "done", "done")
                logger.info(f"Stored {len(chunks)} chunks for manual {manual_id}")

            except Exception as e:
                logger.error(f"Embed task {task_id} failed: {e}")
                await r.rpush("pipeline:dead", emb_data)
                await r.hset(f"pipeline:task:{task_id}", mapping={"status": "failed", "error": str(e)})


if __name__ == "__main__":
    asyncio.run(run_worker())

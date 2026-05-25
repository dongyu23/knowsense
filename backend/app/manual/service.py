import json
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.config import settings
from app.common.exceptions import NotFoundException
from app.common.redis import get_redis
from app.manual.models import ImagePage, Manual


async def _enqueue_pipeline(page_id: str, manual_id: str, minio_path: str) -> None:
    r = get_redis()
    task_id = str(uuid.uuid4())
    # Initialize task state
    await r.hset(
        f"pipeline:task:{task_id}",
        mapping={"status": "pending", "progress": "0/1", "retries": "0", "error": "", "manual_id": manual_id},
    )
    await r.expire(f"pipeline:task:{task_id}", 3600)
    # Push to OCR queue
    task = json.dumps({
        "task_id": task_id,
        "manual_id": manual_id,
        "page_id": page_id,
        "minio_path": minio_path,
    })
    await r.lpush("pipeline:ocr", task)


async def _get_task_progress(task_id: str) -> dict:
    r = get_redis()
    data = await r.hgetall(f"pipeline:task:{task_id}")
    return {k.decode(): v.decode() for k, v in data.items()}


async def create_manual(
    db: AsyncSession,
    user_id: str,
    product_name: str,
    brand: str | None = None,
    model: str | None = None,
    category: str | None = None,
) -> Manual:
    manual = Manual(
        user_id=user_id,
        product_name=product_name,
        brand=brand,
        model=model,
        category=category,
    )
    db.add(manual)
    await db.commit()
    await db.refresh(manual)
    return manual


async def list_manuals(
    db: AsyncSession,
    user_id: str,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Manual], int]:
    base = select(Manual).where(Manual.user_id == user_id, Manual.deleted_at.is_(None))
    total = 0
    if page == 1:
        total = await db.scalar(
            select(func.count()).select_from(Manual).where(Manual.user_id == user_id, Manual.deleted_at.is_(None))
        ) or 0
    result = await db.execute(
        base.order_by(Manual.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total


async def get_manual(db: AsyncSession, manual_id: str, user_id: str) -> Manual:
    result = await db.execute(
        select(Manual).where(
            Manual.id == manual_id, Manual.user_id == user_id, Manual.deleted_at.is_(None)
        )
    )
    manual = result.scalar_one_or_none()
    if not manual:
        raise NotFoundException("说明书不存在")
    return manual


async def update_manual(
    db: AsyncSession,
    manual_id: str,
    user_id: str,
    product_name: str | None = None,
    brand: str | None = None,
    model: str | None = None,
    category: str | None = None,
) -> Manual:
    manual = await get_manual(db, manual_id, user_id)
    if product_name is not None:
        manual.product_name = product_name
    if brand is not None:
        manual.brand = brand
    if model is not None:
        manual.model = model
    if category is not None:
        manual.category = category
    await db.commit()
    await db.refresh(manual)
    return manual


async def update_manual_status(db: AsyncSession, manual_id: str, status: str) -> None:
    await db.execute(
        update(Manual).where(Manual.id == manual_id).values(status=status)
    )
    await db.commit()


async def delete_manual(db: AsyncSession, manual_id: str, user_id: str) -> None:
    from app.knowledge.service import delete_chunks_by_manual
    manual = await get_manual(db, manual_id, user_id)
    await db.execute(
        update(ImagePage).where(ImagePage.manual_id == manual_id).values(deleted_at=manual.updated_at)
    )
    await delete_chunks_by_manual(db, manual_id)
    manual.deleted_at = manual.updated_at
    await db.commit()


async def update_page_ocr_result(
    db: AsyncSession, page_id: str, ocr_text: str, status: str, error: str | None = None
) -> None:
    values = {"ocr_text": ocr_text, "ocr_status": status}
    if error:
        values["ocr_error"] = error
    await db.execute(update(ImagePage).where(ImagePage.id == page_id).values(**values))
    await db.commit()


async def check_and_update_manual_status(db: AsyncSession, manual_id: str) -> None:
    """所有 image_page OCR done → manual.status = 'done'"""
    pending = await db.scalar(
        select(func.count()).select_from(ImagePage).where(
            ImagePage.manual_id == manual_id,
            ImagePage.deleted_at.is_(None),
            ImagePage.ocr_status != 'done',
        )
    )
    if pending == 0:
        await db.execute(
            update(Manual).where(Manual.id == manual_id).values(status='done')
        )
        await db.commit()


async def add_image_pages(
    db: AsyncSession, manual_id: str, minio_paths: list[str]
) -> list[ImagePage]:
    result = await db.execute(
        select(ImagePage)
        .where(ImagePage.manual_id == manual_id)
        .order_by(ImagePage.page_number.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    start_page = (last.page_number + 1) if last else 1

    pages = []
    for i, path in enumerate(minio_paths):
        page = ImagePage(
            manual_id=manual_id, page_number=start_page + i, minio_path=path
        )
        db.add(page)
        pages.append(page)

    await db.commit()
    await db.refresh(pages[0])  # refresh to get IDs

    # Enqueue pipeline tasks
    for page in pages:
        await _enqueue_pipeline(str(page.id), manual_id, page.minio_path)

    # Update page count
    manual = await db.get(Manual, manual_id)
    if manual:
        total = await db.scalar(
            select(func.count()).select_from(ImagePage).where(
                ImagePage.manual_id == manual_id, ImagePage.deleted_at.is_(None)
            )
        )
        manual.total_pages = total
        await db.commit()

    return pages


async def list_image_pages(db: AsyncSession, manual_id: str) -> list[ImagePage]:
    result = await db.execute(
        select(ImagePage)
        .where(ImagePage.manual_id == manual_id, ImagePage.deleted_at.is_(None))
        .order_by(ImagePage.page_number)
    )
    return list(result.scalars().all())


async def get_manual_progress(manual_id: str) -> dict:
    r = get_redis()
    tasks: list[dict] = []
    cursor = 0
    while True:
        cursor, keys = await r.scan(cursor, match="pipeline:task:*", count=100)
        for key in keys:
            data = await r.hgetall(key)
            if data.get(b"manual_id", b"").decode() != manual_id:
                continue
            tasks.append({
                "task_id": key.decode().split(":")[-1],
                **{k.decode(): v.decode() for k, v in data.items()},
            })
        if cursor == 0:
            break
    return {"manual_id": manual_id, "tasks": tasks}

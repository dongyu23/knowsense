import asyncio

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.auth.service import is_token_revoked
from app.common.config import settings
from app.common.database import get_db
from app.common.dependencies import get_current_user_id
from app.common.exceptions import NotFoundException, UnauthorizedException
from app.common.schemas import ApiResponse, PageData
from app.common.sse import sse_event
from app.manual.models import ImagePage
from app.manual.schemas import ImagePageResponse, ManualCreate, ManualResponse, ManualUpdate
from app.storage.service import get_file_url
from app.manual.service import (
    add_image_pages,
    create_manual,
    delete_manual,
    get_manual,
    get_manual_progress,
    list_image_pages,
    list_manuals,
    update_manual,
)
from app.storage.service import upload_file

router = APIRouter(prefix="/api/v1/manuals", tags=["manuals"])


@router.post("")
async def create(
    req: ManualCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    manual = await create_manual(db, user_id, req.product_name, req.brand, req.model, req.category)
    return ApiResponse.ok(data=ManualResponse.model_validate(manual, from_attributes=True).model_dump())


@router.get("")
async def list_all(
    page: int = 1,
    pageSize: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    manuals, total = await list_manuals(db, user_id, page, min(pageSize, 100))
    return ApiResponse.ok(
        data=PageData(
            list=[ManualResponse.model_validate(m, from_attributes=True).model_dump() for m in manuals],
            total=total,
            page=page,
            pageSize=pageSize,
        )
    )


@router.get("/{manual_id}")
async def detail(
    manual_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    manual = await get_manual(db, manual_id, user_id)
    return ApiResponse.ok(data=ManualResponse.model_validate(manual, from_attributes=True).model_dump())


@router.put("/{manual_id}")
async def edit(
    manual_id: str,
    req: ManualUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    manual = await update_manual(
        db, manual_id, user_id,
        product_name=req.product_name,
        brand=req.brand,
        model=req.model,
        category=req.category,
    )
    return ApiResponse.ok(data=ManualResponse.model_validate(manual, from_attributes=True).model_dump())


@router.delete("/{manual_id}")
async def remove(
    manual_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await delete_manual(db, manual_id, user_id)
    return ApiResponse.ok(message="已删除")


@router.delete("/{manual_id}/pages/{page_id}")
async def remove_page(
    manual_id: str,
    page_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_manual(db, manual_id, user_id)
    result = await db.execute(
        select(ImagePage).where(ImagePage.id == page_id, ImagePage.manual_id == manual_id)
    )
    page = result.scalar_one_or_none()
    if not page:
        raise NotFoundException("图片页不存在")
    # Soft delete
    from datetime import datetime, timezone
    page.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    # Clean up chunks for this page
    from app.knowledge.service import delete_chunks_by_page
    await delete_chunks_by_page(db, page_id)
    return ApiResponse.ok(message="已删除")


@router.get("/{manual_id}/progress")
async def progress_stream(
    manual_id: str,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Auth via query param (EventSource doesn't support headers)
    if token:
        from app.auth.jwt import decode_access_token
        from app.auth.service import is_token_revoked
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub", "")
            if await is_token_revoked(db, payload.get("jti", "")):
                raise UnauthorizedException("令牌已撤销")
        except UnauthorizedException:
            raise
        except Exception:
            raise UnauthorizedException("令牌无效")

    async def event_generator():
        while True:
            data = await get_manual_progress(manual_id)
            yield sse_event("progress", data)
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{manual_id}/pages/{page_id}/image")
async def page_image(
    manual_id: str,
    page_id: str,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from app.storage.service import get_minio_client

    # Auth via query param (for <img> tags that can't send headers)
    user_id = None
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub", "")
            if await is_token_revoked(db, payload.get("jti", "")):
                raise UnauthorizedException("令牌已撤销")
        except UnauthorizedException:
            raise
        except Exception:
            raise UnauthorizedException("令牌无效")
    if not user_id:
        raise UnauthorizedException("未提供认证令牌")

    await get_manual(db, manual_id, user_id)
    result = await db.execute(
        select(ImagePage).where(ImagePage.id == page_id, ImagePage.manual_id == manual_id)
    )
    page = result.scalar_one_or_none()
    if not page:
        raise NotFoundException("图片页不存在")

    def iterfile():
        client = get_minio_client()
        resp = client.get_object(settings.minio_bucket, page.minio_path)
        try:
            yield from resp.stream(8192)
        finally:
            resp.close()
            resp.release_conn()

    return StreamingResponse(iterfile(), media_type="image/jpeg")


@router.post("/{manual_id}/pages")
async def upload_pages(
    manual_id: str,
    files: list[UploadFile] = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_manual(db, manual_id, user_id)
    paths = []
    for f in files:
        content = await f.read()
        path = await upload_file(content, f.filename or "image.jpg", f.content_type or "image/jpeg")
        paths.append(path)
    pages = await add_image_pages(db, manual_id, paths)
    return ApiResponse.ok(
        data=[ImagePageResponse.model_validate(p, from_attributes=True).model_dump() for p in pages]
    )


@router.get("/{manual_id}/pages")
async def list_pages(
    manual_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_manual(db, manual_id, user_id)
    pages = await list_image_pages(db, manual_id)
    return ApiResponse.ok(
        data=[ImagePageResponse.model_validate(p, from_attributes=True).model_dump() for p in pages]
    )

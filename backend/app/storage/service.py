import uuid
from io import BytesIO

from minio import Minio

from app.common.config import settings
from app.common.exceptions import BadRequestException

_client: Minio | None = None

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def _validate_file(file_data: bytes, filename: str, content_type: str) -> None:
    if content_type not in ALLOWED_TYPES:
        raise BadRequestException(f"不支持的文件类型: {content_type}，仅支持 JPEG/PNG/WebP/HEIC")
    if len(file_data) > MAX_FILE_SIZE:
        raise BadRequestException(f"文件过大: {len(file_data) / 1024 / 1024:.1f}MB，最大 20MB")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    valid_exts = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
    if ext and ext not in valid_exts:
        raise BadRequestException(f"不支持的文件后缀: .{ext}")


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        _ensure_bucket(_client)
    return _client


def _ensure_bucket(client: Minio) -> None:
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


async def upload_file(file_data: bytes, filename: str, content_type: str) -> str:
    _validate_file(file_data, filename, content_type)
    client = get_minio_client()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    object_name = f"{uuid.uuid4()}.{ext}"
    client.put_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
        data=BytesIO(file_data),
        length=len(file_data),
        content_type=content_type,
    )
    return object_name


async def get_file_url(object_name: str) -> str:
    client = get_minio_client()
    return client.presigned_get_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
    )


async def delete_file(object_name: str) -> None:
    client = get_minio_client()
    client.remove_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
    )

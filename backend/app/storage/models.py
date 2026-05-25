from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import Base, TimestampMixin, UUIDMixin


class FileRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "file_record"

    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    minio_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(default=0)

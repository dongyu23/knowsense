import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Index, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import Base, SoftDeleteMixin, TimestampMixin


class Chunk(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "chunk"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    manual_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("manual.id"), nullable=False, index=True
    )
    image_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("image_page.id"), nullable=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(1024), nullable=True)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default={})

    __table_args__ = (
        Index("ix_chunk_manual_deleted", "manual_id", "deleted_at"),
        Index("ix_chunk_embedding", "embedding", postgresql_using="ivfflat"),
        Index("ix_chunk_search_vector", "search_vector", postgresql_using="gin"),
    )

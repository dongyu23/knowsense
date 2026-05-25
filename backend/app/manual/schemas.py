from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ManualCreate(BaseModel):
    product_name: str
    brand: str | None = None
    model: str | None = None
    category: str | None = None


class ManualResponse(BaseModel):
    id: UUID
    product_name: str
    brand: str | None = None
    model: str | None = None
    category: str | None = None
    total_pages: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ManualUpdate(BaseModel):
    product_name: str | None = None
    brand: str | None = None
    model: str | None = None
    category: str | None = None


class ImagePageResponse(BaseModel):
    id: UUID
    page_number: int
    minio_path: str
    ocr_status: str
    created_at: datetime

    model_config = {"from_attributes": True}

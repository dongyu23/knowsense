from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T | None = None

    @classmethod
    def ok(cls, data: T = None, message: str = "success") -> "ApiResponse[T]":
        return cls(code=200, message=message, data=data)

    @classmethod
    def fail(cls, code: int, message: str) -> "ApiResponse[None]":
        return cls(code=code, message=message, data=None)


class PageData(BaseModel, Generic[T]):
    list: list[T]
    total: int
    page: int
    pageSize: int


class CursorData(BaseModel, Generic[T]):
    list: list[T]
    nextCursor: str | None
    hasMore: bool
    pageSize: int

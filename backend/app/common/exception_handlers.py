from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.common.error_codes import GENERAL_BAD_REQUEST, GENERAL_INTERNAL_ERROR
from app.common.exceptions import KnowSenseException
from app.common.schemas import ApiResponse


async def knowsense_exception_handler(request: Request, exc: KnowSenseException) -> JSONResponse:
    return JSONResponse(
        status_code=_http_status(exc.code),
        content=ApiResponse.fail(code=exc.code, message=exc.message).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    detail = errors[0] if errors else {"msg": "请求参数错误"}
    msg = detail.get("msg", "请求参数错误")
    field = detail.get("loc", ["unknown"])[-1] if detail.get("loc") else ""
    return JSONResponse(
        status_code=400,
        content=ApiResponse.fail(
            code=GENERAL_BAD_REQUEST,
            message=f"参数校验失败: {field} - {msg}",
        ).model_dump(),
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=ApiResponse.fail(code=GENERAL_INTERNAL_ERROR, message="服务器内部错误").model_dump(),
    )


def _http_status(code: int) -> int:
    if 1400 <= code < 1500:
        return code - 1000
    return 500

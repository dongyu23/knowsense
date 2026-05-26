from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, RegisterRequest, UserInfo
from app.auth.service import (
    authenticate_user,
    get_user_by_id,
    issue_token,
    register_user,
    revoke_token,
)
from app.common.database import get_db
from app.common.dependencies import get_current_user_id
from app.common.rate_limit import check_rate_limit
from app.common.schemas import ApiResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
           request.headers.get("X-Real-IP", "") or \
           (request.client.host if request.client else "unknown")


@router.post("/register")
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    await check_rate_limit(f"rate:{_client_ip(request)}:register", limit=5, window_seconds=300)
    user = await register_user(db, req.username, req.email, req.password)
    return ApiResponse.ok(data=UserInfo.model_validate(user, from_attributes=True).model_dump())


@router.post("/login")
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    await check_rate_limit(f"rate:{_client_ip(request)}:login", limit=10, window_seconds=300)
    user = await authenticate_user(db, req.username, req.password)
    token_data = await issue_token(db, user)
    return ApiResponse.ok(data=token_data)


from fastapi import Header


@router.post("/logout")
async def logout(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        return ApiResponse.fail(code=1401, message="未提供认证令牌")
    token = authorization.removeprefix("Bearer ")
    await revoke_token(db, token)
    return ApiResponse.ok(message="已退出")


@router.post("/refresh")
async def refresh(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_id(db, user_id)
    if not user:
        return ApiResponse.fail(code=1404, message="用户不存在")
    token_data = await issue_token(db, user)
    return ApiResponse.ok(data=token_data)


@router.get("/me")
async def me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_id(db, user_id)
    return ApiResponse.ok(data=UserInfo.model_validate(user, from_attributes=True).model_dump())

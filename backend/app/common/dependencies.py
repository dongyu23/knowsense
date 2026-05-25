from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.auth.service import is_token_revoked
from app.common.database import get_db
from app.common.exceptions import UnauthorizedException


async def get_current_user_id(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("未提供认证令牌")
    token = authorization.removeprefix("Bearer ")

    try:
        payload = decode_access_token(token)
    except Exception:
        raise UnauthorizedException("令牌无效或已过期")

    jti = payload.get("jti", "")
    if await is_token_revoked(db, jti):
        raise UnauthorizedException("令牌已被撤销")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("令牌无效")
    return user_id

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.auth.jwt import create_access_token, decode_access_token, get_jti_from_token
from app.auth.models import TokenBlacklist, User
from app.common.exceptions import BadRequestException, ConflictException, UnauthorizedException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_password_strength(password: str) -> None:
    if len(password) < 6:
        raise BadRequestException("密码长度至少为 6 位")
    if len(password) > 72:
        raise BadRequestException("密码长度不能超过 72 位")
    if not re.search(r"[a-zA-Z]", password):
        raise BadRequestException("密码需包含至少一个字母")
    if not re.search(r"\d", password):
        raise BadRequestException("密码需包含至少一个数字")


async def register_user(db: AsyncSession, username: str, email: str, password: str) -> User:
    validate_password_strength(password)

    existing = await db.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    if existing.scalar_one_or_none():
        raise ConflictException("用户名或邮箱已存在")

    user = User(
        username=username,
        email=email,
        password_hash=pwd_context.hash(password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(password, user.password_hash):
        raise UnauthorizedException("用户名或密码错误")
    if not user.is_active:
        raise UnauthorizedException("账户已被禁用")
    return user


async def issue_token(db: AsyncSession, user: User) -> dict:
    token, jti, expire = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer", "expires_at": expire.isoformat()}


async def revoke_token(db: AsyncSession, token: str) -> None:
    jti = get_jti_from_token(token)
    try:
        payload = decode_access_token(token)
        expire = payload.get("exp")
        if expire:
            from datetime import datetime, timezone
            expires_at = datetime.fromtimestamp(expire, tz=timezone.utc)
            blacklist = TokenBlacklist(jti=jti, expires_at=expires_at)
            db.add(blacklist)
            await db.commit()
    except Exception:
        pass


async def is_token_revoked(db: AsyncSession, jti: str) -> bool:
    result = await db.execute(select(TokenBlacklist).where(TokenBlacklist.jti == jti))
    return result.scalar_one_or_none() is not None


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

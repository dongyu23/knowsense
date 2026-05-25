from app.common.redis import get_redis
from app.common.exceptions import BadRequestException


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    r = get_redis()
    current = await r.incr(key)
    if current == 1:
        await r.expire(key, window_seconds)
    if current > limit:
        raise BadRequestException("操作过于频繁，请稍后再试")

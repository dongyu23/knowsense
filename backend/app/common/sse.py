import json
from typing import AsyncGenerator, Any


def sse_event(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def sse_generator(event: str, data_source: AsyncGenerator[Any, None]) -> AsyncGenerator[str, None]:
    async for chunk in data_source:
        yield sse_event(event, chunk)

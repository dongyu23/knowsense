import logging

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed

from app.common.config import settings

logger = logging.getLogger("knowsense.embedder")


def _is_network_error(exc):
    return isinstance(exc, (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError))


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(2),
    wait=wait_fixed(1),
    reraise=True,
)
async def _call_embed_api(client: httpx.AsyncClient, text: str) -> list[float]:
    resp = await client.post(
        settings.embedding_api_url,
        json={"model": settings.embedding_model, "input": text, "encoding_format": "float"},
        headers={"Authorization": f"Bearer {settings.embedding_api_key}"},
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    embeddings = []
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=10.0)) as client:
        for text in texts:
            try:
                vec = await _call_embed_api(client, text)
                embeddings.append(vec)
            except Exception as e:
                logger.error(f"Embedding failed for [{text[:50]}...]: {e}")
                embeddings.append([0.0] * 1024)
    return embeddings

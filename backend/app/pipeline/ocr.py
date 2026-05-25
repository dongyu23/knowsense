import asyncio
import json
import logging
from io import BytesIO

import httpx

from app.common.config import settings

logger = logging.getLogger("knowsense.ocr")

JOB_URL = settings.paddleocr_api_url
TOKEN = settings.paddleocr_api_key
MODEL = "PaddleOCR-VL-1.5"


async def ocr_image(image_url: str) -> str:
    """调用 PaddleOCR API，上传文件，轮询结果，返回 Markdown 文本"""
    headers = {"Authorization": f"bearer {TOKEN}"}

    # 1. 从 MinIO 下载图片
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        img_resp = await client.get(image_url)
        img_resp.raise_for_status()
        image_bytes = img_resp.content

    # 2. 提交 Job（文件上传模式）
    data = {
        "model": MODEL,
        "optionalPayload": json.dumps({
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useChartRecognition": False,
        }),
    }
    files = {"file": ("image.jpg", BytesIO(image_bytes), "image/jpeg")}

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        resp = await client.post(JOB_URL, headers=headers, data=data, files=files)
        if resp.status_code != 200:
            body = resp.text
            raise RuntimeError(f"PaddleOCR submit failed ({resp.status_code}): {body[:300]}")
        job_id = resp.json()["data"]["jobId"]
        logger.info(f"PaddleOCR job submitted: {job_id}")

        # 3. 轮询
        for _ in range(120):
            await asyncio.sleep(5)
            result_resp = await client.get(f"{JOB_URL}/{job_id}", headers=headers)
            result_resp.raise_for_status()
            state = result_resp.json()["data"]["state"]

            if state == "done":
                jsonl_url = result_resp.json()["data"]["resultUrl"]["jsonUrl"]
                jsonl_resp = await client.get(jsonl_url)
                jsonl_resp.raise_for_status()

                lines = jsonl_resp.text.strip().split("\n")
                texts = []
                for line in lines:
                    if not line.strip():
                        continue
                    result = json.loads(line)["result"]
                    for res in result["layoutParsingResults"]:
                        texts.append(res["markdown"]["text"])
                return "\n\n".join(texts)

            elif state == "failed":
                error = result_resp.json()["data"].get("errorMsg", "unknown")
                raise RuntimeError(f"PaddleOCR job failed: {error}")

        raise TimeoutError(f"PaddleOCR job {job_id} timed out")

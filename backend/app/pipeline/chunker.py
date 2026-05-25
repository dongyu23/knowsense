def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """将 OCR 提取的文字按固定长度分块"""
    if not text.strip():
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

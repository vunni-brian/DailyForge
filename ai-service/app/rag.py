import json
import math
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
EMBED_MODEL = os.getenv("DAILYFORGE_OLLAMA_EMBED_MODEL", "nomic-embed-text")
EMBED_URL = f"{OLLAMA_BASE_URL}/api/embed"
EMBED_FALLBACK_URL = f"{OLLAMA_BASE_URL}/api/embeddings"
STORAGE_DIR = Path(
    os.getenv("DAILYFORGE_RAG_STORAGE", Path(__file__).resolve().parent.parent / "storage")
)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_embed_error(message: str) -> str:
    lower = message.lower()
    if "connection refused" in lower or "failed to establish a new connection" in lower:
        return "Ollama is not running. Start it using: ollama serve"
    if "not found" in lower and EMBED_MODEL.lower() in lower:
        return f"Ollama embedding model '{EMBED_MODEL}' is missing. Run: ollama pull {EMBED_MODEL}"
    if "model" in lower and "not found" in lower:
        return f"Ollama embedding model '{EMBED_MODEL}' is missing. Run: ollama pull {EMBED_MODEL}"
    return message


def _response_error_text(response_text: str) -> str:
    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError:
        return response_text
    if isinstance(payload, dict) and isinstance(payload.get("error"), str):
        return _normalize_embed_error(payload["error"])
    return response_text


async def embed(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                EMBED_URL,
                json={"model": EMBED_MODEL, "input": texts},
            )
            if response.is_success:
                data = response.json().get("embeddings")
                if isinstance(data, list) and data:
                    return data
            else:
                detail = _response_error_text(response.text)
                if "missing" in detail.lower() or "not running" in detail.lower():
                    raise HTTPException(status_code=response.status_code, detail=detail)
        except httpx.ConnectError as error:
            raise HTTPException(
                status_code=503,
                detail="Ollama is not running. Start it using: ollama serve",
            ) from error

        vectors: list[list[float]] = []
        for text in texts:
            try:
                response = await client.post(
                    EMBED_FALLBACK_URL,
                    json={"model": EMBED_MODEL, "prompt": text},
                )
            except httpx.ConnectError as error:
                raise HTTPException(
                    status_code=503,
                    detail="Ollama is not running. Start it using: ollama serve",
                ) from error

            if not response.is_success:
                detail = _response_error_text(response.text)
                raise HTTPException(status_code=response.status_code, detail=detail)

            embedding = response.json().get("embedding")
            if not isinstance(embedding, list):
                raise HTTPException(status_code=502, detail="Ollama returned an invalid embedding response.")
            vectors.append(embedding)
        return vectors


def store_path(session_id: str) -> Path:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in session_id)
    return STORAGE_DIR / f"{safe}.json"


def chunk(text: str, size: int = 900, overlap: int = 150) -> list[str]:
    text = " ".join(text.split())
    if not text:
        return []
    out = []
    i = 0
    while i < len(text):
        j = min(i + size, len(text))
        out.append(text[i:j])
        if j == len(text):
            break
        i = max(j - overlap, i + 1)
    return out


def cos(a: list[float], b: list[float]) -> float:
    num = sum(x * y for x, y in zip(a, b))
    da = math.sqrt(sum(x * x for x in a))
    db = math.sqrt(sum(y * y for y in b))
    return num / (da * db) if da and db else 0.0


def load(session_id: str) -> dict[str, Any] | None:
    path = store_path(session_id)
    return json.loads(path.read_text()) if path.exists() else None


async def index(session_id: str, version_hash: str, documents: list[dict[str, Any]]):
    chunks = []
    texts = []
    for document in documents:
        for index_value, content in enumerate(chunk(document.get("text", ""))):
            record = {"id": f"{document['id']}::{index_value}", "title": document.get("title"), "content": content}
            chunks.append(record)
            texts.append(content)
    vectors = await embed(texts) if texts else []
    for record, vector in zip(chunks, vectors):
        record["v"] = vector
    payload = {"session_id": session_id, "version_hash": version_hash, "chunks": chunks}
    store_path(session_id).write_text(json.dumps(payload))
    return {"indexed": True, "count": len(chunks)}


async def retrieve(session_id: str, query: str, top_k: int = 6):
    state = load(session_id)
    if not state or not query:
        return []
    query_vector = (await embed([query]))[0]
    scored = []
    for chunk_entry in state.get("chunks", []):
        scored.append((cos(query_vector, chunk_entry.get("v", [])), chunk_entry))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk_entry for _, chunk_entry in scored[: max(1, top_k)]]

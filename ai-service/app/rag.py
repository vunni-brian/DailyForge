import json
import math
import os
from pathlib import Path
from typing import Any

import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
EMBED_MODEL = os.getenv("DAILYFORGE_OLLAMA_EMBED_MODEL", "nomic-embed-text")
EMBED_URL = f"{OLLAMA_BASE_URL}/api/embed"
EMBED_FALLBACK_URL = f"{OLLAMA_BASE_URL}/api/embeddings"
STORAGE_DIR = Path(os.getenv("DAILYFORGE_RAG_STORAGE", Path(__file__).resolve().parent.parent / "storage"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

async def embed(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            res = await client.post(EMBED_URL, json={"model": EMBED_MODEL, "input": texts})
            res.raise_for_status()
            data = res.json().get("embeddings")
            if isinstance(data, list) and data:
                return data
        except Exception:
            pass
        vectors = []
        for t in texts:
            r = await client.post(EMBED_FALLBACK_URL, json={"model": EMBED_MODEL, "prompt": t})
            r.raise_for_status()
            vectors.append(r.json().get("embedding"))
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
    num = sum(x*y for x,y in zip(a,b))
    da = math.sqrt(sum(x*x for x in a))
    db = math.sqrt(sum(y*y for y in b))
    return num/(da*db) if da and db else 0.0


def load(session_id: str) -> dict[str, Any] | None:
    p = store_path(session_id)
    return json.loads(p.read_text()) if p.exists() else None


async def index(session_id: str, version_hash: str, documents: list[dict[str, Any]]):
    chunks = []
    texts = []
    for d in documents:
        for k, c in enumerate(chunk(d.get("text", ""))):
            rec = {"id": f"{d['id']}::{k}", "title": d.get("title"), "content": c}
            chunks.append(rec)
            texts.append(c)
    vecs = await embed(texts) if texts else []
    for rec, v in zip(chunks, vecs):
        rec["v"] = v
    payload = {"session_id": session_id, "version_hash": version_hash, "chunks": chunks}
    store_path(session_id).write_text(json.dumps(payload))
    return {"indexed": True, "count": len(chunks)}


async def retrieve(session_id: str, query: str, top_k: int = 6):
    s = load(session_id)
    if not s:
        return []
    qv = (await embed([query]))[0]
    scored = []
    for c in s.get("chunks", []):
        scored.append((cos(qv, c.get("v", [])), c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:max(1, top_k)]]

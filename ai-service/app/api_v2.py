import json
import os

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from .rag import index, retrieve

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
GEN_URL = f"{OLLAMA_BASE_URL}/api/generate"
MODEL = os.getenv("DAILYFORGE_OLLAMA_MODEL", "llama3")

app = FastAPI()

class TextReq(BaseModel):
    system: str
    prompt: str
    session_id: str | None = None
    use_rag: bool = False
    query: str | None = None
    top_k: int = 6

class JsonReq(TextReq):
    schema: dict | None = None

async def gen(prompt: str):
    async with httpx.AsyncClient(timeout=120.0) as c:
        r = await c.post(GEN_URL, json={"model": MODEL, "prompt": prompt, "stream": False})
        r.raise_for_status()
        return r.json().get("response", "")

@app.post("/v1/rag/index")
async def rag_index(req: dict):
    return await index(req.get("session_id"), req.get("version_hash"), req.get("documents", []))

@app.post("/v1/rag/retrieve")
async def rag_retrieve(req: dict):
    chunks = await retrieve(req.get("session_id"), req.get("query"), req.get("top_k", 6))
    return {"chunks": chunks}

@app.post("/v1/generate/text")
async def text(req: TextReq):
    ctx = ""
    if req.use_rag and req.session_id and req.query:
        chunks = await retrieve(req.session_id, req.query, req.top_k)
        ctx = "\n\n".join([c.get("content", "") for c in chunks])
    full = f"{req.system}\n\n{ctx}\n\n{req.prompt}"
    return {"content": await gen(full)}

@app.post("/v1/generate/json")
async def json_gen(req: JsonReq):
    ctx = ""
    if req.use_rag and req.session_id and req.query:
        chunks = await retrieve(req.session_id, req.query, req.top_k)
        ctx = "\n\n".join([c.get("content", "") for c in chunks])
    schema = json.dumps(req.schema or {})
    full = f"{req.system}\nReturn JSON only. Schema:{schema}\n{ctx}\n{req.prompt}"
    return {"content": await gen(full)}

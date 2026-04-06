import json
import os

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

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
    model_config = ConfigDict(populate_by_name=True)
    schema_payload: dict | None = Field(default=None, alias="schema")


@app.get("/health")
async def health():
    return {"status": "ok", "ollamaBaseUrl": OLLAMA_BASE_URL, "model": MODEL}


def _normalize_ollama_error(message: str, model: str) -> str:
    lower = message.lower()
    if "connection refused" in lower or "failed to establish a new connection" in lower:
        return "Ollama is not running. Start it using: ollama serve"
    if "not found" in lower and model.lower() in lower:
        return f"Ollama model '{model}' is missing. Run: ollama pull {model}"
    if "model" in lower and "not found" in lower:
        return f"Ollama model '{model}' is missing. Run: ollama pull {model}"
    return message


def _detail_from_response(response_text: str, model: str) -> str:
    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError:
        return response_text
    if isinstance(payload, dict):
        if isinstance(payload.get("error"), str):
            return _normalize_ollama_error(payload["error"], model)
        if isinstance(payload.get("detail"), str):
            return payload["detail"]
    return response_text


async def gen(prompt: str):
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GEN_URL,
                json={"model": MODEL, "prompt": prompt, "stream": False},
            )
    except httpx.ConnectError as error:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it using: ollama serve",
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    if not response.is_success:
        raise HTTPException(
            status_code=response.status_code,
            detail=_detail_from_response(response.text, MODEL),
        )

    data = response.json()
    content = data.get("response")
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="Ollama returned an empty response.")
    return content


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
    schema = json.dumps(req.schema_payload or {})
    full = f"{req.system}\nReturn JSON only. Schema:{schema}\n{ctx}\n{req.prompt}"
    return {"content": await gen(full)}

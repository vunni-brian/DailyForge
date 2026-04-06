from fastapi import FastAPI
from pydantic import BaseModel
import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"

app = FastAPI()

class TextRequest(BaseModel):
    system: str
    prompt: str

class JsonRequest(BaseModel):
    system: str
    prompt: str

@app.get("/health")
def health():
    return {"status": "ok"}

async def call_ollama(prompt: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        })
        res.raise_for_status()
        return res.json().get("response", "")

@app.post("/v1/generate/text")
async def generate_text(req: TextRequest):
    full_prompt = f"{req.system}\n\n{req.prompt}"
    output = await call_ollama(full_prompt)
    return {"content": output}

@app.post("/v1/generate/json")
async def generate_json(req: JsonRequest):
    full_prompt = f"{req.system}\n\nReturn valid JSON only.\n\n{req.prompt}"
    output = await call_ollama(full_prompt)
    return {"content": output}

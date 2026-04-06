# DailyForge AI Service

Run the local backend:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Environment overrides:

- `OLLAMA_BASE_URL` default `http://127.0.0.1:11434`
- `DAILYFORGE_OLLAMA_MODEL` default `llama3`
- `DAILYFORGE_OLLAMA_EMBED_MODEL` default `nomic-embed-text`
- `DAILYFORGE_RAG_STORAGE` optional custom storage path

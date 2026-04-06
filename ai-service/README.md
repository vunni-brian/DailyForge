# Local AI Backend

Run:

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765

Ensure Ollama is running:
ollama run llama3

Then configure DailyForge to call:
http://localhost:8765/v1/generate

# DailyForge local AI + RAG integration guide

This document contains the concrete Rust wiring steps for switching the learning module from OpenAI chat completions to the local FastAPI + Ollama backend.

## New Rust module

Add `src-tauri/src/learning_ai.rs` and import it inside `src-tauri/src/learning.rs`.

## Environment variables

- `DAILYFORGE_AI_BASE_URL` default: `http://127.0.0.1:8765`
- `DAILYFORGE_OLLAMA_MODEL` default: `llama3`
- `DAILYFORGE_OLLAMA_EMBED_MODEL` default: `nomic-embed-text`

## What to change inside learning.rs

1. Replace the OpenAI URL constant with a base URL constant.
2. Remove API-key header construction.
3. Before summary, flashcard, quiz, and tutor generation, call the RAG index helper using current learning sources.
4. For tutor chat and quiz generation, retrieve top matching chunks and append them to the prompt.
5. Post JSON generation requests to `/v1/generate/json` and text generation requests to `/v1/generate/text`.

## Run commands

```bash
ollama pull llama3
ollama pull nomic-embed-text
ollama serve
cd ai-service
pip install -r requirements.txt
uvicorn app.main_v2:app --reload --port 8765
npm run tauri dev
```

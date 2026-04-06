# DailyForge

DailyForge is a desktop-first productivity workspace built with React, TypeScript, Vite, Tauri 2, and SQLite. It currently combines classic workspace modules such as Tasks, Projects, Notes, Focus, Reviews, and Settings with a richer native Learning workspace for study sessions, source ingestion, AI summaries, flashcards, quizzes, tutor chat, and export/import.

## Stack

- React 19 + TypeScript + Vite
- Tauri 2 desktop shell
- SQLite via `@tauri-apps/plugin-sql` and `tauri-plugin-sql`
- Native Rust commands for Learning, file handling, and local AI backend calls

## Current Architecture

DailyForge is in a transition state:

- The Learning feature is desktop-native and uses explicit Tauri commands from [`src/features/learning/api.ts`](./src/features/learning/api.ts) into [`src-tauri/src/learning.rs`](./src-tauri/src/learning.rs).
- The rest of the workspace still flows through [`src/context/app-context.tsx`](./src/context/app-context.tsx) and [`src/repositories/workspace.repository.ts`](./src/repositories/workspace.repository.ts), which persist core app data through the shared SQLite database and maintain a browser snapshot fallback.
- Full backup/import in Settings already includes both the legacy workspace data and the Learning backup payload when the app runs in Tauri.

The target direction is a single native-first architecture with feature-scoped APIs and a thinner global UI context. See [`docs/desktop-architecture.md`](./docs/desktop-architecture.md) and [`docs/action-board.md`](./docs/action-board.md).

## Learning Capabilities

The Learning workspace currently supports:

- session creation and editing
- create session from file
- text, note, URL, file, and folder source ingestion
- AI-generated summaries
- AI-generated flashcards
- AI-generated quizzes and scoring
- grounded tutor threads
- progress and review history
- session export/import and full backup integration

## Requirements

- Node.js 20+
- Rust toolchain compatible with Tauri 2
- Windows/macOS/Linux prerequisites for Tauri 2 builds

## Environment Configuration

Learning AI actions use a local FastAPI backend from the Rust side. By default DailyForge uses:

- backend `http://127.0.0.1:8765`
- Ollama `http://127.0.0.1:11434`
- model `llama3`
- embedding model `nomic-embed-text`

Backend and model overrides:

- `DAILYFORGE_AI_BASE_URL`
- `DAILYFORGE_OLLAMA_BASE_URL`
- `DAILYFORGE_OLLAMA_MODEL`
- `DAILYFORGE_OLLAMA_EMBED_MODEL`

DailyForge does not call Ollama directly anymore. [`src-tauri/src/learning_ai.rs`](./src-tauri/src/learning_ai.rs) calls the FastAPI service, and the FastAPI service under [`ai-service`](./ai-service) calls Ollama using `/api/generate` and `/api/embed`.

Start the local backend with:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Development

Install dependencies:

```bash
npm install
```

Run the web app only:

```bash
npm run dev
```

The web-only dev server is useful for UI work, but desktop-only features such as Learning, file dialogs, and SQLite-backed native commands require Tauri.

Run the desktop app in development:

```bash
npm run tauri:dev
```

## Database and Storage

SQLite is loaded from `sqlite:dailyforge.db`.

Native database setup:

- schema migration `0001_init.sql` creates the core workspace tables
- schema migration `0002_learning_lab.sql` creates the Learning tables
- migrations are registered in [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs)

Desktop storage paths:

- database: `<app data>/dailyforge.db`
- Learning attachments: `<app data>/learning/sessions/<session-id>/sources`

The exact app-data root depends on the OS and Tauri identifier. On Windows builds it resolves under the user AppData directory for `com.vunnibrian.dailyforge`.

## Backup and Import

From Settings, `Export Full Backup` writes a JSON file that contains:

- the workspace backup managed by `AppContext` and the workspace repository
- the full Learning backup managed by native commands when running in Tauri

Learning also supports per-session export/import from the session page:

- session JSON bundle
- flashcards CSV export

## Build

Build the frontend:

```bash
npm run build
```

Build desktop bundles:

```bash
npm run tauri:build
```

## Repository Notes

- This repo targets Tauri 2, not Tauri v1.
- `src-tauri/tauri.conf.json` includes an explicit production CSP and dev CSP.
- Learning is already indexed in the shell search palette alongside tasks, projects, and notes.

## Additional Docs

- [`docs/desktop-architecture.md`](./docs/desktop-architecture.md)
- [`docs/action-board.md`](./docs/action-board.md)

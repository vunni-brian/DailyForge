# Desktop Architecture

## Snapshot

DailyForge currently runs with two architectural styles in one desktop app.

### Native-first Learning

The Learning workspace is the strongest reference implementation for the direction of the app:

- frontend feature API in [`src/features/learning/api.ts`](../src/features/learning/api.ts)
- explicit Tauri command boundary in [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs)
- native domain and persistence logic in [`src-tauri/src/learning.rs`](../src-tauri/src/learning.rs)
- SQLite-backed structured data
- app-managed file storage for imported sources
- Rust-side FastAPI integration for local AI

### Legacy workspace context

Tasks, Projects, Notes, Reviews, Focus, and Settings still route through:

- [`src/context/app-context.tsx`](../src/context/app-context.tsx)
- [`src/repositories/workspace.repository.ts`](../src/repositories/workspace.repository.ts)

That layer already uses SQLite in Tauri, but it still centralizes business logic and orchestration in the React context and keeps a browser snapshot path for fallback and sync.

## Current Risks

- Two persistence patterns increase maintenance cost.
- Export/import has to bridge two data models.
- Cross-feature actions have to reach through both the global context and native feature APIs.
- Legacy `learningItems` semantics still overlap with the richer Learning sessions model.

## Target Architecture

DailyForge should converge on one native-first desktop architecture:

- feature-scoped frontend APIs per domain
- thin UI providers for transient shell state only
- explicit Tauri command boundaries
- native repositories and services grouped by domain
- one local database and one backup model

## Recommended End State

### Frontend

- `src/features/<domain>/api.ts` for typed command boundaries
- `src/features/<domain>/hooks` for orchestration
- local component state for UI-only concerns
- optional small shell provider for composer state, theme, keyboard shortcuts, and similar UI state

### Native layer

- grouped commands by domain: tasks, projects, notes, focus, reviews, learning, backup
- grouped Rust services for database access, file storage, and AI/network calls
- versioned migrations and versioned backup payloads

## Migration Plan

### Phase 1

- keep Learning as the reference model
- integrate Learning into shell-level search and quick actions
- document the split architecture and release behavior
- preserve a shared backup path across workspace + Learning

### Phase 2

- extract feature APIs for Tasks, Projects, Notes, Reviews, Focus, and Settings
- move business logic out of `AppContext`
- reduce `AppContext` to shell/session UI state

### Phase 3

- replace browser snapshot fallback as the primary persistence story
- move backup/import orchestration to a native-first flow
- retire or migrate legacy `learningItems`

## Persistence Model Today

- core workspace tables are created by migration `0001_init.sql`
- Learning tables are created by migration `0002_learning_lab.sql`
- both persist into the same `dailyforge.db` database
- Learning files live in `<app data>/learning/sessions/<session-id>/sources`

## Security Model

- Tauri runs with an explicit production CSP and dev CSP in [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json)
- native commands are registered explicitly in [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs)
- Rust calls the local FastAPI service, and FastAPI is the only layer that calls Ollama when the user triggers Learning AI actions

## Immediate Follow-through

The next structural milestone is not another large feature. It is converging Tasks, Projects, Notes, Reviews, Focus, and Settings on the same feature-API and native-persistence style already used by Learning.

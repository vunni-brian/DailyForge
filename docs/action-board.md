# Action Board

This board translates the current architecture and release cleanup into concrete repo work.

## Done Now

| ID | Item | Priority | Effort | Status | Acceptance |
| --- | --- | --- | --- | --- | --- |
| DF-01 | Align versions across frontend and native manifests | High | Low | Done | `package.json`, `package-lock.json`, `Cargo.toml`, and `tauri.conf.json` all use `0.1.0`. |
| DF-02 | Harden desktop CSP | Critical | Medium | Done | `src-tauri/tauri.conf.json` contains explicit `csp` and `devCsp`. |
| DF-03 | Bring Learning into shell search and quick actions | High | Medium | Done | Search can find Learning sessions and open create, summary, flashcards, and tutor flows. |
| DF-04 | Document the real Tauri 2 desktop architecture | High | Medium | Done | README and architecture docs describe Tauri 2, SQLite, Learning, AI config, storage, and migration direction. |

## Next Up

| ID | Item | Priority | Effort | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| DF-05 | Shrink `AppContext` into shell-only UI state | Critical | High | DF-04 | `AppContext` stops owning task/project/note/review/focus business logic and persistence orchestration. |
| DF-06 | Standardize feature APIs for core modules | High | Medium | DF-05 | Tasks, Projects, Notes, Reviews, Focus, and Settings expose feature-scoped APIs instead of giant context mutations. |
| DF-07 | Move core modules to native-first persistence | Critical | High | DF-05, DF-06 | Core modules use typed command boundaries and SQLite-backed native repositories as the primary model. |
| DF-08 | Rationalize legacy `learningItems` | Medium | Medium | DF-05 | Legacy learning items are either migrated into Learning sessions or fully retired. |
| DF-09 | Harden Learning error and recovery flows | Medium | Medium | DF-04 | AI failures, malformed payloads, import validation, and retries preserve last good data and show clear UI states. |

## Release Engineering

| ID | Item | Priority | Effort | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| DF-10 | Add desktop release checklist | Medium | Medium | DF-04 | Clean install, upgrade, backup/import round-trip, offline behavior, and file-ingestion cases are documented and repeatable. |
| DF-11 | Review Rust command and service boundaries | Medium | Medium | DF-07 | Native modules are grouped by domain and separated into command, storage, DB, and AI concerns. |
| DF-12 | Tag and verify release flow | Medium | Medium | DF-10 | Release versioning, build artifacts, and validation steps are documented and used consistently. |

## Suggested Build Order

1. Reduce `AppContext` scope.
2. Add feature APIs for Tasks, Projects, Notes, Reviews, Focus, and Settings.
3. Move those modules behind native-first repositories and commands.
4. Retire `learningItems`.
5. Harden recovery and release discipline.

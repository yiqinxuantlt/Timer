# AGENTS.md — Study Timer (Tauri 2)

## Quick Start

```bash
# Frontend dev (browser only)
npm run dev

# Full desktop app (requires Rust toolchain)
npm run tauri:dev

# Production build
npm run tauri:build
```

**⚠️ Rust required for `tauri:dev` / `tauri:build`.** If `cargo` is missing, `tauri dev` fails silently. Frontend-only dev works without Rust.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Zustand
- **Backend**: Rust (Tauri 2) — stores data in `study_data.json` at app data dir
- **State**: 3 Zustand stores — `timerStore`, `statsStore`, `settingsStore`
- **Data flow**: Frontend → Tauri IPC → Rust `lib.rs` → JSON file

## Key Files

| Path | Purpose |
|---|---|
| `src-tauri/src/lib.rs` | Rust backend — all Tauri commands |
| `src/App.tsx` | Main React component, keyboard shortcuts, notifications |
| `src/stores/timerStore.ts` | Timer state machine (IDLE → RUNNING → PAUSED → COMPLETED) |
| `src/stores/statsStore.ts` | Session history, today total, streak calc |
| `src/stores/settingsStore.ts` | User prefs (persisted via zustand/localStorage) |
| `src/types/index.ts` | Shared TypeScript interfaces |

## Timer Logic (CRITICAL)

**Never use `setInterval` to decrement seconds.** The timer uses timestamp-based calculation:

```typescript
// Correct: calculate from timestamps
const elapsed = Date.now() - startedAt - cumulativePausedDuration;

// Wrong: do not decrement a counter
elapsedSeconds--;
```

This handles system sleep, tab backgrounding, and drift correctly. See `timerStore.ts` for implementation.

## Tauri ↔ Frontend Bridge

- Frontend detects Tauri via `typeof window !== 'undefined' && '__TAURI__' in window`
- Tauri APIs are lazy-imported: `await import('@tauri-apps/api/window')`
- Commands: `get_study_data`, `save_study_session`, `save_study_data`, `clear_study_data`

## Window Config (tauri.conf.json)

- Size: 320×420 (normal), 160×200 (compact mode)
- `decorations: false`, `transparent: true`, `alwaysOnTop: true`
- CSP: `null` (disabled for dev — re-enable before production release)

## Gotchas

- **Rust build**: `src-tauri/Cargo.toml` uses `edition = "2021"`, needs `chrono` + `uuid` crates
- **Data path**: Rust saves to `%APPDATA%/study-timer/study_data.json` (Windows)
- **Dual persistence**: Frontend saves to localStorage AND Tauri backend (if available)
- **Global shortcuts**: Only registered in Tauri env (Space = play/pause, Escape = stop)
- **Compact mode**: Toggles window size via `@tauri-apps/api/window`

# Study Timer — Tauri 2

## Quick start

```bash
npm run dev          # browser preview
npm run tauri:dev    # full desktop app; requires Rust
npm run build        # frontend build
npm run tauri:build  # desktop release build
```

## Architecture

- Frontend: React 18, TypeScript, Vite, Zustand
- Desktop: Tauri 2 with a small Rust JSON persistence layer
- Stores: `timerStore`, `statsStore`, `settingsStore`
- Services: `storageService`, `windowService`, `notificationService`
- Hooks: `useTimer`, `useKeyboardShortcuts`, `useWindowManagement`

## Key files

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Page composition and lifecycle side effects |
| `src/stores/timerStore.ts` | Timer finite-state machine and session boundaries |
| `src/stores/statsStore.ts` | Session history and derived statistics |
| `src/services/storageService.ts` | Tauri IPC persistence and browser fallback |
| `src/utils/timer.ts` | Timestamp-based elapsed time and progress |
| `src/utils/stats.ts` | Valid-session, today-total and streak rules |
| `src-tauri/src/lib.rs` | Atomic JSON read/write commands |

## Timer rules (critical)

Never use `setInterval` to decrement seconds. Calculate elapsed time from timestamps:

```typescript
const elapsed = Date.now() - startedAt - cumulativePausedDuration;
```

The state machine is `IDLE → RUNNING → PAUSED → RUNNING`, with terminal `COMPLETED` and `CANCELLED` states. Active timer timestamps are persisted so a restart can recover the session.

## Persistence and statistics

- Tauri commands: `get_study_data` and `save_study_data`.
- Desktop data: `%APPDATA%/study-timer/study_data.json`.
- Browser fallback: `study-timer-sessions` in localStorage.
- Rust writes through a temporary file and rename for atomic replacement.
- Only completed sessions lasting at least 60 seconds affect statistics.
- Today and streak dates are based on the session start date.

## Window and platform behavior

- Normal window: 320 × 420; compact window: 220 × 140.
- Decorations are disabled, transparency is enabled, and always-on-top defaults to true.
- Tauri-only APIs are dynamically imported and guarded by platform detection.
- Global shortcuts are registered only when enabled and are cleaned up on unmount.

## Verification

Run `npm run typecheck`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml` before declaring changes complete. Also follow `.agents/skills/desktop-app-qa/SKILL.md` for manual timer, persistence, window, DPI, and interaction checks.

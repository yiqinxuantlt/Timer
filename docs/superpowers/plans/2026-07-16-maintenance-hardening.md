# Study Timer Maintenance Hardening Implementation Plan

> **For agentic workers:** Execute the tasks in order. Each task leaves the project in a testable state; do not skip the verification command for a completed task.

**Goal:** Fix the confirmed timer-display defect, make desktop data persistence resilient to concurrent launches and corrupted files, remove known development-tool vulnerabilities, restore engineering checks, and make browser preview and modal interactions reliable and accessible.

**Architecture:** Keep timestamp-based timer calculations in `src/utils/timer.ts`. Preserve the existing React + Zustand + Tauri 2 boundaries: Rust owns the fixed application-data file, `storageService` owns IPC/localStorage fallback and serial client writes, `statsStore` exposes persistence health, and presentation components render state through narrow selectors. No cloud sync, database migration, or new application feature is introduced.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, React Testing Library, Tauri 2, Rust, GitHub Actions.

---

## File map

| File | Responsibility after this work |
| --- | --- |
| `src/utils/timer.ts` | Pure timestamp-derived elapsed/progress calculations, including terminal completed snapshots. |
| `src-tauri/src/lib.rs` | Single-instance setup, serialized app-data writes, unique durable temporary files, and backup recovery. |
| `src/services/storageService.ts` | Serialized IPC writes, browser fallback, and non-destructive persistence warnings. |
| `src/stores/statsStore.ts` | Sessions, derived metrics, and user-visible storage-warning state. |
| `src/components/{TitleBar,HistoryModal,SettingsPanel}.tsx` | Browser-compatible controls and accessible modal behavior. |
| `src/hooks/useDialogFocus.ts` | Shared focus restoration, Escape handling, and Tab trapping for modal dialogs. |
| `vite.config.ts` | Loopback-only, strict Vite development server configuration. |
| `.eslintrc.cjs`, `.prettierrc.json` | Reproducible lint and formatting rules. |
| `.github/workflows/ci.yml` | Type, test, format, build, Rust check, and dependency-audit checks. |
| `tests/*.test.ts[x]` | Regression coverage for timer, statistics, storage normalization, and modal behavior. |

## Task 1: Fix the completed timer snapshot first

**Files:**

- Modify: `src/utils/timer.ts`
- Create: `tests/timer.test.ts`

- [ ] **Step 1: Add a failing regression test for a completed timer whose runtime timestamps have been cleared.**

  ```ts
  expect(
    calculateElapsed({
      status: 'COMPLETED',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
      completedDuration: 3_600_000
    })
  ).toBe(3_600_000);
  ```

- [ ] **Step 2: Run the targeted test and confirm the pre-fix implementation fails because it returns zero.**

  Run: `npm.cmd test -- tests/timer.test.ts`

- [ ] **Step 3: Check `COMPLETED` before the missing-`startedAt` guard.**

  ```ts
  if (status === 'IDLE') return 0;
  if (status === 'COMPLETED') return Math.max(0, completedDuration ?? 0);
  if (!startedAt) return 0;
  ```

- [ ] **Step 4: Cover paused snapshots, progress clamping, and a completed snapshot with no stored final duration.**

- [ ] **Step 5: Run the focused test suite.**

  Run: `npm.cmd test -- tests/timer.test.ts`

## Task 2: Harden desktop data ownership and recovery

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src/services/storageService.ts`
- Modify: `src/stores/statsStore.ts`
- Modify: `src/types/index.ts`
- Create: `tests/storageRecords.test.ts`

- [ ] **Step 1: Add the official Tauri single-instance plugin and focus the existing main window when a second launch is attempted.**

  ```rust
  #[cfg(desktop)]
  .plugin(tauri_plugin_single_instance::init(|app, _, _| {
      if let Some(window) = app.get_webview_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
      }
  }))
  ```

- [ ] **Step 2: Serialize Rust reads/writes with managed mutex state and retain atomic replacement.**

  The `save_study_data` command must lock before creating a unique temporary filename. Write the JSON through `OpenOptions::create_new`, call `sync_all`, replace the target on the same filesystem, and remove an uncommitted temporary file on failure.

- [ ] **Step 3: Maintain a validated `study_data.backup.json` before a successful replacement and recover it when the primary JSON cannot be parsed.**

  Only overwrite the backup after successfully deserializing the current primary file. If the primary is corrupt and the backup is valid, restore the backup atomically and return recovered data. If both are invalid, return a clear command error rather than pretending that the file is empty.

- [ ] **Step 4: Remove the unused Store plugin and replace broad/default capability grants with the exact window, event, notification, and global-shortcut permissions used by source code.**

  Keep only `allow-start-dragging`, `allow-minimize`, `allow-close`, `allow-destroy`, `allow-set-always-on-top`, `allow-set-size`, `allow-set-min-size`, `allow-listen`, notification permission/notify calls, and shortcut registration/unregistration.

- [ ] **Step 5: Return structured storage results rather than silently swallowing failures.**

  ```ts
  interface StorageResult {
    warning: string | null;
  }

  interface LoadSessionsResult extends StorageResult {
    sessions: FocusSession[];
  }
  ```

  If desktop loading or saving fails, write only the browser fallback, retain the desktop file for recovery, and return a warning. Do not automatically overwrite a failed desktop data file from fallback data.

- [ ] **Step 6: Let `statsStore` expose `storageWarning` and update it after loading, adding, deleting, or clearing sessions.**

- [ ] **Step 7: Test malformed-record normalization and valid legacy record compatibility.**

- [ ] **Step 8: Verify the Rust manifest and code.**

  Run: `cargo check --manifest-path src-tauri/Cargo.toml`

## Task 3: Upgrade vulnerable development tooling and add CI checks

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `src-tauri/tauri.conf.json`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Upgrade Vite, the React plugin, and Vitest to mutually compatible supported versions.**

  Use Vite 8, `@vitejs/plugin-react` 6, and Vitest 4, all compatible with the current Node 24 runtime. Add React Testing Library, Testing Library DOM, jest-dom, and jsdom for the component tests in Task 6.

- [ ] **Step 2: Make the development server local-only and retain strict file access.**

  ```ts
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    cors: false,
    fs: { strict: true }
  }
  ```

  Match `src-tauri/tauri.conf.json` `devUrl` to `http://127.0.0.1:5173` and use the Vite 8 minifier configuration.

- [ ] **Step 3: Add a CI workflow that runs `npm ci`, typecheck, test, lint, format check, build, `npm audit --audit-level=high`, and `cargo check`.**

- [ ] **Step 4: Confirm npm audit no longer reports high or critical vulnerabilities.**

  Run: `npm.cmd audit --audit-level=high`

## Task 4: Restore linting and formatting as enforceable engineering checks

**Files:**

- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`
- Modify: source files only where lint or formatting finds real violations

- [ ] **Step 1: Add a browser/Node TypeScript ESLint configuration with React Hooks rules and ignored build directories.**

- [ ] **Step 2: Add a shared Prettier configuration matching the repository’s existing semicolon and single-quote style.**

- [ ] **Step 3: Run the formatter over the maintained source and configuration paths, then fix remaining lint findings without weakening rules.**

  Run: `npm.cmd run format` then `npm.cmd run lint` and `npm.cmd run format:check`

## Task 5: Complete browser fallback and accessible modal behavior

**Files:**

- Create: `src/hooks/useDialogFocus.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TitleBar.tsx`
- Modify: `src/components/ContextMenu.tsx`
- Modify: `src/components/HistoryModal.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Always render the title/subject/settings/history surface; hide only native window controls and always-on-top controls outside Tauri.**

- [ ] **Step 2: Narrow Zustand subscriptions in title and context-menu components to individual values/actions.**

- [ ] **Step 3: Add a reusable dialog hook.**

  It must preserve the previously focused element, focus the dialog on open, close on Escape, keep Tab and Shift+Tab inside the dialog, and restore focus when the dialog closes.

- [ ] **Step 4: Apply `role="dialog"`, `aria-modal="true"`, labelled headings, focus refs, and shared dialog handling to Settings and History.**

- [ ] **Step 5: Reset the destructive clear-all confirmation whenever History closes, and defer `URL.revokeObjectURL` until after the export click has been consumed.**

- [ ] **Step 6: Render `storageWarning` in a concise, non-blocking status area so persistence fallback is visible to the user.**

- [ ] **Step 7: Verify the browser preview renders subject editing, settings, history, and a functioning basic timer without browser-console errors.**

## Task 6: Expand tests and complete quality assurance

**Files:**

- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/stats.test.ts`
- Create: `tests/HistoryModal.test.tsx`
- Create: `tests/SettingsPanel.test.tsx`
- Modify: `tsconfig.json`

- [ ] **Step 1: Configure jsdom only for component tests and load `@testing-library/jest-dom/vitest` from the test setup.**

- [ ] **Step 2: Add pure utility coverage for valid-session filtering, today-total date ownership, streak breaks, completed display, paused display, and progress limits.**

- [ ] **Step 3: Add dialog regression tests: Escape closes, focus moves into the dialog, focus restores on close, and closing/reopening History cancels a pending clear-all confirmation.**

- [ ] **Step 4: Run all automated checks.**

  Run: `npm.cmd run typecheck`

  Run: `npm.cmd test`

  Run: `npm.cmd run lint`

  Run: `npm.cmd run format:check`

  Run: `npm.cmd run build`

  Run: `cargo check --manifest-path src-tauri/Cargo.toml`

- [ ] **Step 5: Perform the applicable desktop-app QA checks.**

  Verify start/pause/resume/stop/completion, browser fallback, data loading, single-instance behavior, settings/history keyboard interaction, native window controls, and empty console output. Record environment-limited checks separately rather than claiming they passed.

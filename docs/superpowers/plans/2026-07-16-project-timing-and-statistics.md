# Project Timing and Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable project-based timer selection and project-level statistics while retaining every existing focus record.

**Architecture:** `statsStore` owns one persisted snapshot containing sessions and projects. `timerStore` owns the selected project for the active timer and copies its ID/name into a new session. Pure functions calculate valid-session analytics; presentation components render those results.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Tauri 2/Rust, CSS Modules, Vitest.

---

## File map

| File | Change |
| --- | --- |
| `src/types/index.ts` | Project, project link and analytics types. |
| `src/utils/projects.ts` | Default project, palette, validation, lookup. |
| `src/utils/stats.ts` | Project summaries and continuous seven-day totals. |
| `src/services/storageService.ts` | Full study-data snapshot persistence/migration. |
| `src/stores/statsStore.ts` | Project CRUD plus session/project atomic persistence. |
| `src/stores/timerStore.ts` | Selected project and session snapshot field. |
| `src-tauri/src/lib.rs` | Serde-compatible project records. |
| `src/components/ProjectPicker.*` | Title-bar project selection and creation. |
| `src/components/ProjectManagerModal.*` | Rename, recolor, archive and restore. |
| `src/components/ProjectAnalytics.*` | Seven-day and per-project display. |
| `src/components/{TitleBar,TodayStats,HistoryModal}.*` | Integrate picker and statistics/records tabs. |
| `src/App.tsx` | Own the project manager modal. |
| `tests/{projects,stats,storageService,timerStore,statsStore,projectComponents,dialogs}.test.*` | Regression coverage. |

### Task 1: Add the project domain

**Files:**
- Create: `src/utils/projects.ts`
- Modify: `src/types/index.ts`
- Create: `tests/projects.test.ts`

- [ ] **Step 1: Write failing domain tests.**

~~~ts
it('normalizes projects with exactly one default project', () => {
  expect(normalizeProjects([
    { id: 'math', name: '数学', color: 'cyan', createdAt: 1, archivedAt: null },
    { id: 'invalid', name: '', color: 'bad', createdAt: 1, archivedAt: null },
    { id: 'math', name: '重复', color: 'rose', createdAt: 1, archivedAt: null }
  ]).map((project) => project.id)).toEqual(['project-default', 'math']);
});

it('rejects a normalized duplicate but creates a valid project', () => {
  const project = createProject('英语阅读', 'violet', [], 42, () => 'english');
  expect(project).toMatchObject({ id: 'english', name: '英语阅读', color: 'violet' });
  expect(createProject('英语阅读', 'rose', [project!], 43, () => 'duplicate')).toBeNull();
});
~~~

- [ ] **Step 2: Run the focused test.**

Run: `npm.cmd test -- projects.test.ts`  
Expected: FAIL because `utils/projects` is absent.

- [ ] **Step 3: Add types and helper implementation.**

Add `ProjectColor`, `StudyProject`, nullable `projectId` on `FocusSession` and `StudyRecord`, and these interfaces in `src/types/index.ts`:

~~~ts
export interface ProjectSummary {
  key: string;
  projectId: string | null;
  name: string;
  color: ProjectColor;
  isLegacy: boolean;
  todayDuration: number;
  totalDuration: number;
  sessionCount: number;
  share: number;
}

export interface DailyFocusTotal {
  date: string;
  duration: number;
}
~~~

Implement `DEFAULT_PROJECT` as `{ id: 'project-default', name: '学习', color: 'indigo', createdAt: 0, archivedAt: null }`; use six fixed colors, 20 trimmed characters, case-insensitive duplicate validation, and no mutation of the input array. Export `normalizeProjects`, `createProject`, `findProjectById`, and `getProjectColorValue`.

- [ ] **Step 4: Verify and commit.**

Run: `npm.cmd test -- projects.test.ts`  
Expected: PASS.

Run: `npm.cmd run typecheck`  
Expected: PASS.

Run:
~~~bash
git add src/types/index.ts src/utils/projects.ts tests/projects.test.ts
git commit -m "feat: define study projects"
~~~

### Task 2: Persist a complete study-data snapshot

**Files:**
- Modify: `src/services/storageService.ts`
- Modify: `src-tauri/src/lib.rs`
- Modify: `tests/storageService.test.ts`

- [ ] **Step 1: Write failing migration tests.**

Test a legacy record with no `projects` or `projectId`, and a modern record with both fields:

~~~ts
await expect(loadStudyData()).resolves.toMatchObject({
  sessions: [expect.objectContaining({ id: 'legacy', projectId: null })],
  projects: [expect.objectContaining({ id: 'project-default' })]
});
~~~

Also assert browser fallback writes `{ records, projects, total_seconds }` as a single JSON object and preserves a linked project.

- [ ] **Step 2: Run the focused test.**

Run: `npm.cmd test -- storageService.test.ts`  
Expected: FAIL because `loadStudyData` and `persistStudyData` are not exported.

- [ ] **Step 3: Implement the TypeScript snapshot API.**

Replace the session-only storage contract with:

~~~ts
export interface StudyDataSnapshot {
  sessions: FocusSession[];
  projects: StudyProject[];
}

export interface LoadStudyDataResult extends StorageResult, StudyDataSnapshot {}

export async function loadStudyData(): Promise<LoadStudyDataResult>;
export function persistStudyData(snapshot: StudyDataSnapshot): Promise<StorageResult>;
~~~

Normalize a non-empty string `RawStudyRecord.projectId` or use `null`; pass raw projects through `normalizeProjects`; write `projectId` in `toStudyRecord`. Keep the Promise write queue, backup behavior, malformed-record write protection, Tauri warning, and browser fallback behavior. A malformed project list must raise a warning and block destructive desktop replacement just as malformed records do.

- [ ] **Step 4: Extend Rust serde models.**

Add:

~~~rust
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProjectRecord {
    id: String,
    name: String,
    color: String,
    #[serde(rename = "createdAt")]
    created_at: i64,
    #[serde(rename = "archivedAt", default)]
    archived_at: Option<i64>,
}
~~~

Add `#[serde(rename = "projectId", default)] project_id: Option<String>` to `SessionRecord`, and `#[serde(default)] projects: Vec<ProjectRecord>` to `StudyData`. Preserve all atomic write, backup and locking code.

- [ ] **Step 5: Verify and commit.**

Run: `npm.cmd test -- storageService.test.ts`  
Expected: PASS.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`  
Expected: PASS.

Run:
~~~bash
git add src/services/storageService.ts src-tauri/src/lib.rs tests/storageService.test.ts
git commit -m "feat: persist projects with study data"
~~~

### Task 3: Add pure project analytics

**Files:**
- Modify: `src/utils/stats.ts`
- Modify: `tests/stats.test.ts`

- [ ] **Step 1: Write failing aggregation tests.**

~~~ts
const summaries = calculateProjectSummaries(
  [
    createSession({ projectId: 'math', subject: '数学', duration: 120_000 }),
    createSession({ projectId: null, subject: '英语', duration: 60_000 }),
    createSession({ projectId: 'math', subject: '数学', duration: 20_000 })
  ],
  [DEFAULT_PROJECT, { id: 'math', name: '数学', color: 'cyan', createdAt: 0, archivedAt: null }],
  timestamp(5, 20)
);
expect(summaries).toEqual(expect.arrayContaining([
  expect.objectContaining({ projectId: 'math', totalDuration: 120_000, sessionCount: 1 }),
  expect.objectContaining({ projectId: null, name: '英语', isLegacy: true, totalDuration: 60_000 })
]));
~~~

Test `calculateRecentDailyTotals` returns all seven date-contiguous rows including zero-duration dates.

- [ ] **Step 2: Run the focused test.**

Run: `npm.cmd test -- stats.test.ts`  
Expected: FAIL because aggregation functions do not exist.

- [ ] **Step 3: Implement the analytics functions.**

~~~ts
export function calculateProjectSummaries(
  sessions: FocusSession[],
  projects: StudyProject[],
  now?: number
): ProjectSummary[];

export function calculateRecentDailyTotals(
  sessions: FocusSession[],
  now?: number,
  days?: number
): DailyFocusTotal[];
~~~

Filter with the existing `isValidSession`; use `startedAt` for today/day keys. Group linked sessions by ID, legacy sessions by `legacy:<normalized-subject>`, and missing project IDs by their session snapshot. Sort by descending total then name. Compute zero-safe `share` from total valid duration. Build daily dates oldest-to-newest and include zeroes.

- [ ] **Step 4: Verify and commit.**

Run: `npm.cmd test -- projects.test.ts stats.test.ts`  
Expected: PASS.

Run:
~~~bash
git add src/utils/stats.ts tests/stats.test.ts
git commit -m "feat: calculate project analytics"
~~~

### Task 4: Attach project selection to persisted sessions

**Files:**
- Modify: `src/stores/statsStore.ts`
- Modify: `src/stores/timerStore.ts`
- Create: `tests/statsStore.test.ts`
- Modify: `tests/timerStore.test.ts`

- [ ] **Step 1: Write failing store tests.**

Verify project create/update/archive/restore persists a matching project/session snapshot, clearing history leaves projects intact, and a selected project becomes the next saved session’s `projectId` and `subject`. Verify selection is ignored while RUNNING or PAUSED.

- [ ] **Step 2: Run the focused tests.**

Run: `npm.cmd test -- statsStore.test.ts timerStore.test.ts`  
Expected: FAIL because project state/actions do not exist.

- [ ] **Step 3: Implement project ownership in `statsStore`.**

Add `projects` and these signatures:

~~~ts
createProject: (input: { name: string; color: ProjectColor }) => Promise<StudyProject | null>;
updateProject: (id: string, input: { name: string; color: ProjectColor }) => Promise<StudyProject | null>;
archiveProject: (id: string) => Promise<boolean>;
restoreProject: (id: string) => Promise<boolean>;
~~~

Load sessions/projects atomically from `loadStudyData`. Mutations must produce immutable arrays and call one internal `persistSnapshot(sessions, projects)`. Reject archival of `project-default`; it may be renamed/recolored. Archive with `Date.now()`; do not delete sessions.

- [ ] **Step 4: Implement selected-project timer state.**

Add `projectId: DEFAULT_PROJECT.id` to `TimerState`, `initialState`, and persistence. Add:

~~~ts
setProject: (project: StudyProject) => {
  if (isTimerActive(get().status) || get().pomodoroWaitingForConfirmation) return;
  set({ projectId: project.id, subject: project.name });
}
~~~

Add `projectId: state.projectId || DEFAULT_PROJECT.id` to `createSession`. Do not alter timestamp calculations, transition guards, pause/resume behavior, or Pomodoro focus-only saving.

- [ ] **Step 5: Verify and commit.**

Run: `npm.cmd test -- statsStore.test.ts timerStore.test.ts`  
Expected: PASS.

Run: `npm.cmd run typecheck`  
Expected: PASS.

Run:
~~~bash
git add src/stores/statsStore.ts src/stores/timerStore.ts tests/statsStore.test.ts tests/timerStore.test.ts
git commit -m "feat: attach timer sessions to projects"
~~~

### Task 5: Implement project picker and manager

**Files:**
- Create: `src/components/ProjectPicker.tsx`
- Create: `src/components/ProjectPicker.module.css`
- Create: `src/components/ProjectManagerModal.tsx`
- Create: `src/components/ProjectManagerModal.module.css`
- Modify: `src/components/TitleBar.tsx`
- Modify: `src/components/TitleBar.module.css`
- Modify: `src/App.tsx`
- Create: `tests/projectComponents.test.tsx`

- [ ] **Step 1: Write failing interaction tests.**

Test an idle picker opens active projects and selects one; a RUNNING picker is disabled; valid creation selects the new project; duplicate creation shows an aria-live error; default project has no archive action; archived project exposes restore.

- [ ] **Step 2: Run the focused test.**

Run: `npm.cmd test -- projectComponents.test.tsx`  
Expected: FAIL because project components do not exist.

- [ ] **Step 3: Build `ProjectPicker`.**

Give it `disabled` and `onManage` props. It selects precise store slices, lists only non-archived projects, opens/closes with click-outside/Escape, creates through `statsStore.createProject`, then calls `timerStore.setProject`. The creation form has a 20-character name input, six accessible color buttons, loading disable, and aria-live validation. Use `getProjectColorValue` for each color dot.

- [ ] **Step 4: Build `ProjectManagerModal` and wire App.**

Render active projects before archived ones. Each entry supports explicit-save rename/color changes and archive/restore. The default project has no archive control. After a selected-project edit, reselect the returned project; after its archival, select `DEFAULT_PROJECT`. `App.tsx` owns `projectManagerOpen`, passes the callback through `TitleBar`, and renders this modal.

- [ ] **Step 5: Replace free-text subject UI in `TitleBar`.**

~~~tsx
<ProjectPicker
  disabled={status === 'RUNNING' || status === 'PAUSED'}
  onManage={onOpenProjectManager}
/>
~~~

Keep window controls, Tauri guards, drag region, focus labels, and compact behavior. Use a fixed-width ellipsized trigger with project dot; remove only the unused direct title-bar input state.

- [ ] **Step 6: Verify and commit.**

Run: `npm.cmd test -- projectComponents.test.tsx dialogs.test.tsx`  
Expected: PASS.

Run: `npm.cmd run build`  
Expected: PASS.

Run:
~~~bash
git add src/components/ProjectPicker.tsx src/components/ProjectPicker.module.css src/components/ProjectManagerModal.tsx src/components/ProjectManagerModal.module.css src/components/TitleBar.tsx src/components/TitleBar.module.css src/App.tsx tests/projectComponents.test.tsx
git commit -m "feat: add project selection and management"
~~~

### Task 6: Render project statistics and records

**Files:**
- Create: `src/components/ProjectAnalytics.tsx`
- Create: `src/components/ProjectAnalytics.module.css`
- Modify: `src/components/HistoryModal.tsx`
- Modify: `src/components/HistoryModal.module.css`
- Modify: `src/components/TodayStats.tsx`
- Modify: `src/components/TodayStats.module.css`
- Modify: `tests/dialogs.test.tsx`

- [ ] **Step 1: Write failing analytics UI tests.**

Seed two projects plus a legacy session. Assert the Statistics tab shows seven days, every project bucket, today/total/count/share; switch to Records and assert project naming; spy on export data and assert both `projectId` and `projectName`; assert `TodayStats` shows selected project today time.

- [ ] **Step 2: Run the focused test.**

Run: `npm.cmd test -- dialogs.test.tsx`  
Expected: FAIL because tabs and project analytics do not exist.

- [ ] **Step 3: Build presentational `ProjectAnalytics`.**

~~~ts
interface ProjectAnalyticsProps {
  dailyTotals: DailyFocusTotal[];
  summaries: ProjectSummary[];
}
~~~

Render a seven-column bar strip scaled by the maximum duration (zero remains zero), then project cards with color dot, name, today, cumulative, valid count, percent, and clipped share fill. Use only props; do not mutate stores or calculate time inside this component.

- [ ] **Step 4: Integrate modal tabs and export.**

Add local `activeTab: 'stats' | 'records'` to `HistoryModal`; reset it to `'stats'` on opening. Memoize `calculateProjectSummaries` and `calculateRecentDailyTotals`, then pass results to `ProjectAnalytics`. Keep all delete, clear, focus-trap and grouping behavior on Records. Export:

~~~ts
{
  projectId: session.projectId,
  projectName: session.subject,
  subject: session.subject,
  status: session.status,
  mode: session.mode
}
~~~

Use project lookup only to choose the record’s color; keep the historical `subject` snapshot text unchanged.

- [ ] **Step 5: Enrich `TodayStats`.**

Select `todayTotal`, `sessions`, `projects`, and `timerStore.projectId`; find the selected project and derive that project’s today total via the new pure summaries. Render a secondary line with color dot, project name, and formatted duration, including zero.

- [ ] **Step 6: Apply compatible styles.**

Use existing glass variables, 4px-grid spacing, tabular numerals, focus-visible rings, low-saturation project colors, and no horizontal overflow at 320×420. Provide hover/active/disabled states. Animation must use opacity/transform transitions only and honor `prefers-reduced-motion`.

- [ ] **Step 7: Verify and commit.**

Run: `npm.cmd test -- dialogs.test.tsx projectComponents.test.tsx`  
Expected: PASS.

Run: `npm.cmd run build`  
Expected: PASS.

Run:
~~~bash
git add src/components/ProjectAnalytics.tsx src/components/ProjectAnalytics.module.css src/components/HistoryModal.tsx src/components/HistoryModal.module.css src/components/TodayStats.tsx src/components/TodayStats.module.css tests/dialogs.test.tsx
git commit -m "feat: show project statistics and history"
~~~

### Task 7: Run regression and desktop QA

**Files:**
- Check: all project feature files, all tests, `src-tauri/src/lib.rs`.

- [ ] **Step 1: Run all automated tests.**

Run: `npm.cmd test`  
Expected: all suites PASS without project-state console errors.

- [ ] **Step 2: Run required build gates.**

Run: `npm.cmd run typecheck`  
Expected: PASS.

Run: `npm.cmd run build`  
Expected: PASS.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`  
Expected: PASS.

- [ ] **Step 3: Run the desktop QA checklist.**

Check three project creation/selection, RUNNING and PAUSED lockout, valid 60-second save, pause/resume duration, auto completion, rename, archive/restore, restart persistence, browser fallback, export, keyboard focus, 100%/125% scaling, modal scrolling, compact mode, and reduced-motion behavior.

- [ ] **Step 4: Commit exact verification fixes only when needed.**

Run:
~~~bash
git add src/components/HistoryModal.tsx src/components/HistoryModal.module.css src/components/ProjectAnalytics.tsx src/components/ProjectAnalytics.module.css src/components/ProjectPicker.tsx src/components/ProjectPicker.module.css src/components/ProjectManagerModal.tsx src/components/ProjectManagerModal.module.css src/services/storageService.ts src/stores/statsStore.ts src/stores/timerStore.ts src/utils/projects.ts src/utils/stats.ts src/types/index.ts src-tauri/src/lib.rs tests/dialogs.test.tsx tests/projectComponents.test.tsx tests/projects.test.ts tests/stats.test.ts tests/statsStore.test.ts tests/storageService.test.ts tests/timerStore.test.ts
git commit -m "fix: harden project analytics"
~~~


# Study Timer Tauri 2 Migration Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Scope:** Complete migration from Tauri 1 + Vanilla JS to Tauri 2 + React + TypeScript + Vite + Zustand

---

## 1. Background

### Current State
- **Framework:** Tauri 1.6 (Rust backend + WebView frontend)
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **State Management:** None (local variables in main.js)
- **Styling:** Green theme (#8fa98f), flat design
- **Persistence:** JSON file via Rust commands + localStorage fallback
- **Features:** Timer, progress ring, subject input, stats, history

### Target State
- **Framework:** Tauri 2.0 (upgraded Rust backend + WebView)
- **Frontend:** React 18.3 + TypeScript 5.5 + Vite 5.4
- **State Management:** Zustand (centralized stores)
- **Styling:** Blue-purple glassmorphism (#6366f1 → #8b5cf6)
- **Persistence:** Tauri Store v2 + SQLite (future)
- **Features:** Timer + keyboard shortcuts + compact mode + notifications

---

## 2. Architecture

### Phase 1: Project Scaffold

Create minimal runnable skeleton with new tech stack.

**Directory Structure:**
```
桌面计时小应用/
├── src/                          # React frontend (Vite dev server)
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component (placeholder)
│   ├── index.html                # HTML template
│   ├── vite-env.d.ts             # Vite type declarations
│   └── styles/
│       └── globals.css           # Global styles + CSS variables
│
├── src-tauri/                    # Tauri 2 backend
│   ├── src/
│   │   ├── lib.rs                # App setup + commands
│   │   └── main.rs               # Binary entry
│   ├── capabilities/
│   │   └── default.json          # Permission declarations
│   ├── Cargo.toml                # Dependencies (tauri 2)
│   └── tauri.conf.json           # Window/config
│
├── package.json                  # npm dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
└── .gitignore
```

**Key Changes from Tauri 1:**
- `devPath: "../src"` → `devPath: "http://localhost:5173"` (Vite server)
- `distDir: "../src"` → `distDir: "../dist"` (Vite build output)
- `tauri.conf.json` schema v2 format
- `allowlist` → `capabilities` permission system
- Rust commands: `#[tauri::command]` unchanged, but invoke path differs

**Dependencies:**
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-global-shortcut": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

---

### Phase 2: Core Rewrite

Migrate existing functionality to React + Zustand + new visual system.

#### 2.1 Component Tree

```
App.tsx
├── TitleBar                    # Window drag region + controls
│   ├── drag region (data-tauri-drag-region)
│   └── MinimizeButton
│   └── CloseButton
│
├── TimerSection                # Timer core area
│   ├── TimerRing               # SVG circular progress (160px)
│   └── TimerDisplay            # Time value + status label
│
├── SubjectInput                # Subject name input
│
├── Controls                    # Action buttons
│   ├── StartButton
│   ├── PauseButton
│   └── StopButton
│
├── StatsCard                   # Today/Total stats
│
└── HistoryPanel                # Collapsible history
    ├── HistoryToggle
│   └── HistoryList
```

#### 2.2 Zustand Stores

**timerStore.ts:**
```typescript
interface TimerState {
  // FSM states
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  
  // Timestamp-based timing (no stored seconds)
  startedAt: number | null;
  targetDuration: number;       // milliseconds, default 3600000
  pausedAt: number | null;
  cumulativePausedDuration: number;
  
  // Subject
  subject: string;
  
  // Actions
  start: (subject?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: (save?: boolean) => void;
  reset: () => void;
  setSubject: (s: string) => void;
}
```

**statsStore.ts:**
```typescript
interface StatsState {
  sessions: FocusSession[];
  todayTotal: number;           // milliseconds
  currentStreak: number;        // days
  
  // Actions
  addSession: (session: Omit<FocusSession, 'id'>) => void;
  deleteSession: (id: string) => void;
  loadFromStorage: () => Promise<void>;
}

interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
}
```

**settingsStore.ts:**
```typescript
interface SettingsState {
  targetDuration: number;
  compactMode: boolean;
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
  
  // Actions (persisted via Tauri Store)
  setTargetDuration: (ms: number) => void;
  toggleCompactMode: () => void;
}
```

#### 2.3 Visual System Migration

**Color Tokens (globals.css):**
```css
:root {
  --accent-primary: #6366f1;     /* 靛蓝紫 */
  --accent-secondary: #8b5cf6;   /* 浅紫 */
  --glass-bg: rgba(15, 15, 25, 0.75);
  --glass-border: rgba(255, 255, 255, 0.08);
  --text-primary: #e8eaf6;
  --text-secondary: rgba(232, 234, 246, 0.7);
}
```

**Glassmorphism:**
```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Progress Ring:**
- Gradient from `#6366f1` to `#8b5cf6`
- Radius: 70px, circumference: ~439.8px
- CSS transition: `stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)`

#### 2.4 Tauri Commands (Rust)

Port existing commands to Tauri 2 format:

```rust
// lib.rs
#[tauri::command]
async fn get_study_data(app: AppHandle) -> Result<StudyData, String> {
    // Load from Store or JSON file
}

#[tauri::command]
async fn save_study_session(
    app: AppHandle,
    duration_seconds: u64,
    subject: String
) -> Result<StudyData, String> {
    // Append to records, save
}

#[tauri::command]
async fn clear_study_data(app: AppHandle) -> Result<StudyData, String> {
    // Reset to empty
}
```

---

### Phase 3: Enhanced Features

#### 3.1 Keyboard Shortcuts

**Hook: useKeyboardShortcuts.ts**
```typescript
// Space: start/pause/resume toggle
// Escape: stop (save session)

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        // Toggle based on status
        break;
      case 'Escape':
        if (status === 'RUNNING' || status === 'PAUSED') {
          stop(true);
        }
        break;
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [status]);
```

#### 3.2 Compact Mode

**Window Sizes:**
- Normal: 320×420
- Compact: 160×200

**CompactTimer Component:**
- 80×80 progress ring
- 48px time display (--text-3xl)
- Status label only
- No subject input, controls, stats, history

**Toggle Mechanism:**
```typescript
// settingsStore.toggleCompactMode triggers:
async function resizeWindow() {
  const win = getCurrentWindow();
  const size = compactMode ? { width: 160, height: 200 } : { width: 320, height: 420 };
  await win.setSize(size.width, size.height);
}
```

#### 3.3 Desktop Notifications

**Trigger Condition:**
- When `elapsed >= targetDuration` and status transitions to `COMPLETED`

**Implementation:**
```typescript
import { sendNotification } from '@tauri-apps/plugin-notification';

async function notifyCompletion() {
  await sendNotification({
    title: '专注完成',
    body: `已完成 ${formatDuration(elapsed)} 的学习`,
  });
}
```

---

## 3. Implementation Sequence

**Phase 1 (Scaffold):**
1. Delete old `src/` (index.html, main.js, styles.css)
2. Initialize Vite + React + TypeScript
3. Upgrade `src-tauri/` to Tauri 2
4. Configure `tauri.conf.json` for Vite dev server
5. Create placeholder App.tsx with basic structure
6. Verify `npm run tauri dev` works

**Phase 2 (Core):**
1. Create Zustand stores (timer, stats, settings)
2. Implement timer state machine with timestamp logic
3. Create React components (TitleBar, TimerRing, TimerDisplay, Controls, etc.)
4. Implement CSS Modules with glassmorphism
5. Connect Rust commands to React frontend
6. Verify all existing features work

**Phase 3 (Enhancements):**
1. Add useKeyboardShortcuts hook
2. Implement CompactTimer + window resize
3. Add notification plugin + trigger logic
4. Final testing

---

## 4. Data Migration

**Existing Data:**
- Location: `app_data_dir/study_data.json`
- Format: `{ records: [...], total_seconds: number }`

**Migration Strategy:**
- No transformation needed — keep same file location and format
- New app reads same file via Tauri 2 API
- `StudyData` Rust struct unchanged

---

## 5. Testing Criteria

**Phase 1 Pass:**
- `npm run tauri dev` launches window
- TypeScript compiles without errors
- Placeholder UI renders

**Phase 2 Pass:**
- Timer starts/pauses/stops correctly
- Progress ring animates smoothly
- Stats display correct values
- History panel expands/collapses
- Sessions persist across restarts

**Phase 3 Pass:**
- Space key toggles timer
- Escape key stops timer
- Compact mode window resizes correctly
- Notification appears on completion

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tauri 2 API changes break existing commands | Test each command immediately after migration |
| CSS glassmorphism doesn't work on all Windows versions | Test on Windows 10 and 11; fallback to solid background |
| Zustand store doesn't persist correctly | Use Tauri Store adapter, not localStorage |
| Keyboard shortcuts conflict with input focus | Check `e.target.tagName` before handling |

---

## 7. Out of Scope

- Data export (JSON/CSV) — Phase 4
- History delete — Phase 4
- Subject autocomplete — Phase 4
- Custom target duration UI — Phase 4
- App icons (use default) — Future task
- macOS compatibility — Secondary priority

---

## 8. References

- Skills: `study-timer-builder`, `desktop-widget-ui`, `timer-state-machine`, `tauri-desktop-integration`, `react-component-architecture`
- Tauri 2 Migration Guide: https://v2.tauri.app/start/migrate/
- Zustand Docs: https://zustand-demo.pmnd.rs/
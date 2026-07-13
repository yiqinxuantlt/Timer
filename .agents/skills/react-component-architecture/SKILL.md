---
name: react-component-architecture
description: >
  React component architecture and Zustand state management patterns for the study timer app.
  Use when designing new components, organizing component trees, creating Zustand stores,
  or deciding state placement. Defines component hierarchy, data flow, and state ownership
  boundaries. Must be loaded before creating any new React component or store.
---

# React Component Architecture — 组件架构与状态管理

本 Skill 定义桌面学习计时器的 React 组件架构、Zustand 状态管理规范和组件通信模式。

---

## 1. 组件树结构

```
App.tsx
├── TitleBar                    # 窗口拖拽区 + 控制按钮（最小化/关闭）
├── TimerSection                # 计时核心区域
│   ├── TimerRing               # SVG 圆形进度环
│   └── TimerDisplay            # 时间数值显示 + 状态标签
├── SubjectInput                # 科目名称输入框（可折叠）
├── Controls                    # 操作按钮组（开始/暂停/停止）
├── StatsCard                   # 今日专注统计卡片
├── HistoryPanel                # 历史记录可折叠面板
└── SettingsPanel               # 设置面板（目标时长、主题等）
```

### 紧凑模式树（compact mode）

```
App.tsx (compact)
└── CompactTimer                # 紧凑模式专用容器
    ├── TimerRing (缩小版)      # 80×80 进度环
    └── TimerDisplay (精简版)   # 大字号时间 + 状态标签
```

### 组件分类

| 类别 | 组件 | 特点 |
|---|---|---|
| **展示组件** | TimerDisplay, StatsCard, HistoryPanel | 接收 props，无状态逻辑 |
| **容器组件** | TimerSection, CompactTimer | 连接 store，组合子组件 |
| **交互组件** | Controls, SubjectInput, SettingsPanel | 处理用户输入，调用 store actions |
| **平台组件** | TitleBar | 与 Tauri API 耦合 |

---

## 2. Zustand 状态管理

### Store 划分

```
src/stores/
├── timerStore.ts      # 计时器状态机（5 状态）
├── statsStore.ts      # 统计数据（今日/累计/连续天数）
├── settingsStore.ts   # 应用设置（目标时长、主题等）
└── uiStore.ts         # UI 状态（紧凑模式、面板展开等）
```

### timerStore — 计时器状态机

```typescript
import { create } from 'zustand';

interface TimerState {
  // 状态机
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

  // 时间基准（基于时间戳，不存储已过秒数）
  startedAt: number | null;
  targetDuration: number;       // 目标时长（毫秒）
  pausedAt: number | null;
  cumulativePausedDuration: number; // 累计暂停时长（毫秒）

  // 当前科目
  subject: string;

  // Actions
  start: (subject?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: (save?: boolean) => void;
  reset: () => void;
  setTargetDuration: (ms: number) => void;
  setSubject: (subject: string) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  status: 'IDLE',
  startedAt: null,
  targetDuration: 3600000, // 默认 1 小时
  pausedAt: null,
  cumulativePausedDuration: 0,
  subject: '学习',

  start: (subject) => {
    const now = Date.now();
    set({
      status: 'RUNNING',
      startedAt: now,
      pausedAt: null,
      cumulativePausedDuration: 0,
      subject: subject ?? get().subject,
    });
  },

  pause: () => {
    set({
      status: 'PAUSED',
      pausedAt: Date.now(),
    });
  },

  resume: () => {
    const { pausedAt, cumulativePausedDuration } = get();
    if (!pausedAt) return;

    const pauseDuration = Date.now() - pausedAt;
    set({
      status: 'RUNNING',
      pausedAt: null,
      cumulativePausedDuration: cumulativePausedDuration + pauseDuration,
    });
  },

  stop: (save = true) => {
    // 保存逻辑委托给 statsStore
    set({
      status: 'IDLE',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
    });
  },

  reset: () => {
    set({
      status: 'IDLE',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
    });
  },

  setTargetDuration: (ms) => set({ targetDuration: ms }),
  setSubject: (subject) => set({ subject }),
}));
```

### 计算属性（通过 getter / 自定义 hook）

```typescript
// hooks/useTimer.ts
import { useMemo } from 'react';
import { useTimerStore } from '../stores/timerStore';

export function useElapsed() {
  const { status, startedAt, pausedAt, cumulativePausedDuration } = useTimerStore();

  return useMemo(() => {
    if (status === 'IDLE' || !startedAt) return 0;

    const now = Date.now();
    const effectiveEnd = pausedAt ?? now;
    return effectiveEnd - startedAt - cumulativePausedDuration;
  }, [status, startedAt, pausedAt, cumulativePausedDuration]);
}

export function useProgress() {
  const targetDuration = useTimerStore((s) => s.targetDuration);
  const elapsed = useElapsed();

  return useMemo(() => {
    if (targetDuration <= 0) return 0;
    return Math.min(elapsed / targetDuration, 1);
  }, [elapsed, targetDuration]);
}
```

### statsStore — 统计与持久化

```typescript
import { create } from 'zustand';

interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;       // 实际专注时长（毫秒）
  targetDuration: number; // 目标时长（毫秒）
}

interface StatsState {
  sessions: FocusSession[];
  todayTotal: number;       // 今日累计时长（毫秒）
  currentStreak: number;    // 连续天数

  // Actions
  addSession: (session: Omit<FocusSession, 'id'>) => void;
  deleteSession: (id: string) => void;
  loadSessions: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  todayTotal: 0,
  currentStreak: 0,

  addSession: (session) => {
    const newSession = { ...session, id: crypto.randomUUID() };
    set((state) => {
      const sessions = [...state.sessions, newSession];
      const todayTotal = recalculateTodayTotal(sessions);
      const currentStreak = recalculateStreak(sessions);
      return { sessions, todayTotal, currentStreak };
    });
    // 持久化
    persistSessions(get().sessions);
  },

  deleteSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const todayTotal = recalculateTodayTotal(sessions);
      const currentStreak = recalculateStreak(sessions);
      return { sessions, todayTotal, currentStreak };
    });
    persistSessions(get().sessions);
  },

  loadSessions: async () => {
    // 从 Tauri Store 或 SQLite 加载
    const sessions = await loadSessionsFromStorage();
    set({
      sessions,
      todayTotal: recalculateTodayTotal(sessions),
      currentStreak: recalculateStreak(sessions),
    });
  },
}));

// 辅助函数
function recalculateTodayTotal(sessions: FocusSession[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => s.endedAt >= todayStart.getTime())
    .reduce((sum, s) => sum + s.duration, 0);
}

function recalculateStreak(sessions: FocusSession[]): number {
  // 从今天开始往前计算连续天数
  // 每天至少有一次完成的 session 算作一天
  const dates = new Set(
    sessions.map((s) => {
      const d = new Date(s.endedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      // 允许今天还没开始
      break;
    }
  }
  return streak;
}

async function persistSessions(sessions: FocusSession[]) {
  // 委托给 storageService
  const { persistSessions } = await import('../services/storageService');
  await persistSessions(sessions);
}

async function loadSessionsFromStorage(): Promise<FocusSession[]> {
  const { loadSessions } = await import('../services/storageService');
  return loadSessions();
}
```

### settingsStore — 应用设置

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  targetDuration: number;     // 默认目标时长（毫秒）
  compactMode: boolean;       // 紧凑模式
  alwaysOnTop: boolean;       // 窗口置顶
  notificationEnabled: boolean;

  setTargetDuration: (ms: number) => void;
  toggleCompactMode: () => void;
  toggleAlwaysOnTop: () => void;
  toggleNotification: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      targetDuration: 3600000,
      compactMode: false,
      alwaysOnTop: true,
      notificationEnabled: true,

      setTargetDuration: (ms) => set({ targetDuration: ms }),
      toggleCompactMode: () => set({ compactMode: !get().compactMode }),
      toggleAlwaysOnTop: () => set({ alwaysOnTop: !get().alwaysOnTop }),
      toggleNotification: () => set({ notificationEnabled: !get().notificationEnabled }),
    }),
    {
      name: 'settings-storage',
      // 使用 Tauri Store 适配器，非 localStorage
      storage: createTauriStorageAdapter(),
    }
  )
);
```

### uiStore — UI 状态（不持久化）

```typescript
import { create } from 'zustand';

interface UIState {
  historyExpanded: boolean;
  settingsOpen: boolean;
  showCompletionAnimation: boolean;

  toggleHistory: () => void;
  toggleSettings: () => void;
  triggerCompletionAnimation: () => void;
  dismissCompletionAnimation: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  historyExpanded: false,
  settingsOpen: false,
  showCompletionAnimation: false,

  toggleHistory: () => set({ historyExpanded: !get().historyExpanded }),
  toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
  triggerCompletionAnimation: () => set({ showCompletionAnimation: true }),
  dismissCompletionAnimation: () => set({ showCompletionAnimation: false }),
}));
```

---

## 3. 数据流

### 单向数据流

```
用户操作
  │
  ▼
组件调用 Store Action
  │
  ▼
Zustand Store 更新状态
  │
  ├─► UI 组件自动重渲染（useStore selector）
  │
  └─► 副作用（通过 subscribe 或 useStore 的 useEffect）
        │
        ├─► 持久化到 Tauri Store / SQLite
        ├─► 发送 Tauri 事件（系统通知、窗口控制）
        └─► 触发跨 store 操作
```

### 跨 Store 通信

```typescript
// 示例：timerStore.complete → statsStore.addSession
// 通过 Zustand 的 getState 实现跨 store 调用

// 在 timerStore 中：
import { useStatsStore } from './statsStore';

// 在 stop() action 内：
stop: (save = true) => {
  const state = get();
  if (save && state.startedAt) {
    const elapsed = Date.now() - state.startedAt - state.cumulativePausedDuration;
    useStatsStore.getState().addSession({
      subject: state.subject,
      startedAt: state.startedAt,
      endedAt: Date.now(),
      duration: elapsed,
      targetDuration: state.targetDuration,
    });
  }
  // ...重置状态
}
```

### 组件订阅原则

```typescript
// ✅ 正确：selector 精确选择，避免不必要重渲染
const elapsed = useTimerStore((s) => s.elapsed);

// ❌ 错误：整个 store 订阅
const store = useTimerStore();
```

---

## 4. 组件通信模式

### Props 传递（展示组件）

```typescript
// ✅ 展示组件只接收 props
interface TimerDisplayProps {
  elapsed: number;
  status: TimerState['status'];
}

function TimerDisplay({ elapsed, status }: TimerDisplayProps) {
  // 纯展示逻辑，无 store 依赖
}
```

### Store 直接连接（容器组件）

```typescript
// ✅ 容器组件连接 store
function TimerSection() {
  const elapsed = useElapsed();
  const progress = useProgress();
  const status = useTimerStore((s) => s.status);

  return (
    <div className="timer-section">
      <TimerRing progress={progress} status={status} />
      <TimerDisplay elapsed={elapsed} status={status} />
    </div>
  );
}
```

### 事件回调（交互组件）

```typescript
// ✅ 交互组件接收回调 props
interface ControlsProps {
  status: TimerState['status'];
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

function Controls({ status, onStart, onPause, onStop }: ControlsProps) {
  // 根据 status 渲染对应按钮
}
```

---

## 5. Hooks 设计

### 目录规范

```
src/hooks/
├── useTimer.ts             # 计时器计算属性（useElapsed, useProgress）
├── useKeyboardShortcuts.ts # 键盘快捷键
├── useSystemEvents.ts      # 系统事件（休眠/锁屏）
├── useWindowManagement.ts  # Tauri 窗口控制
└── useTimerTick.ts         # 计时器 tick 驱动
```

### useTimerTick — 驱动计时器更新

```typescript
// 这是唯一使用 setInterval 的地方
// 用于驱动计时显示更新，而非计算时间
import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores/timerStore';

export function useTimerTick() {
  const status = useTimerStore((s) => s.status);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (status !== 'RUNNING') return;

    const interval = setInterval(() => {
      // 触发重新渲染（不传递实际值）
      forceUpdate((n) => n + 1);
    }, 100); // 100ms 更新一次，保证显示平滑

    return () => clearInterval(interval);
  }, [status]);
}
```

### useKeyboardShortcuts

```typescript
import { useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';

export function useKeyboardShortcuts() {
  const { status, start, pause, resume, stop } = useTimerStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 忽略输入框内的快捷键
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (status === 'IDLE') start();
          else if (status === 'RUNNING') pause();
          else if (status === 'PAUSED') resume();
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
  }, [status, start, pause, resume, stop]);
}
```

### useSystemEvents — 系统事件

```typescript
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTimerStore } from '../stores/timerStore';

export function useSystemEvents() {
  const pause = useTimerStore((s) => s.pause);
  const status = useTimerStore((s) => s.status);

  useEffect(() => {
    const unlistenSleep = listen('tauri://on_sleep', () => {
      if (status === 'RUNNING') {
        pause();
      }
    });

    const unlistenTrayToggle = listen('tray-toggle', () => {
      // 托盘"开始/暂停"事件
      const state = useTimerStore.getState();
      if (state.status === 'IDLE') state.start();
      else if (state.status === 'RUNNING') state.pause();
      else if (state.status === 'PAUSED') state.resume();
    });

    const unlistenTrayReset = listen('tray-reset', () => {
      useTimerStore.getState().stop(false);
    });

    return () => {
      unlistenSleep.then((fn) => fn());
      unlistenTrayToggle.then((fn) => fn());
      unlistenTrayReset.then((fn) => fn());
    };
  }, [pause, status]);
}
```

---

## 6. 组件拆分规则

### 何时拆分为新组件

| 条件 | 示例 |
|---|---|
| 代码超过 80 行 | TimerRing 从 App.tsx 中抽出 |
| 有独立的复用价值 | 毛玻璃卡片可以复用 |
| 有独立的 state/effect | SubjectInput 有自动补全状态 |
| 条件渲染复杂 | CompactTimer 与主视图不同 |
| 需要单独测试 | Controls 需要测试所有状态组合 |

### 组件文件模板

```typescript
import { memo } from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Props 定义
}

function ComponentName({ /* props */ }: ComponentNameProps) {
  return (
    <div className={styles.container}>
      {/* 组件内容 */}
    </div>
  );
}

export default memo(ComponentName);
```

### 组件命名约定
- 文件：`PascalCase.tsx`
- 组件函数：`PascalCase`
- Props 接口：`ComponentNameProps`
- CSS Module：`component-name.module.css`

---

## 7. 性能优化

### React.memo 使用准则
```typescript
// ✅ 展示组件用 memo
export default memo(TimerDisplay);

// ✅ props 频繁变化的组件，确保 selector 精确
const status = useTimerStore((s) => s.status);
```

### useCallback / useMemo
```typescript
// ✅ 传给子组件的回调用 useCallback
const handleStart = useCallback(() => store.start(), []);

// ✅ 耗时计算用 useMemo
const formattedTime = useMemo(() => formatTime(elapsed), [elapsed]);
```

### 避免的问题
- ❌ 在组件内创建新的对象/数组 props（破坏 memo 比较）
- ❌ 不必要的 `useState`（能用 store 则用 store）
- ❌ 在渲染中直接调用 `Date.now()`
- ❌ 在 store selector 中返回新对象

---

## 8. 与 Tauri 集成

### Tauri 事件 → React 组件
```typescript
// 在 App.tsx 中集中监听
function App() {
  useTimerTick();
  useKeyboardShortcuts();
  useSystemEvents();
  useWindowManagement();

  const compactMode = useSettingsStore((s) => s.compactMode);

  return compactMode ? <CompactTimer /> : <FullTimer />;
}
```

### React → Tauri 命令调用
```typescript
// 通过 services 层封装，不在组件中直接调用 invoke
// services/storageService.ts
import { invoke } from '@tauri-apps/api/core';

export async function saveSession(session: FocusSession) {
  return invoke('save_session', { session });
}
```
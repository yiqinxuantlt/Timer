# 性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对桌面计时小应用进行三阶段渐进式性能优化，解决渲染、CSS动画、组件订阅、IPC 等方面的性能问题

**Architecture:** 本应用为 Tauri 2 + React 18 + TypeScript + Zustand + Vite 架构。优化分为三个阶段：核心性能（计时器驱动、CSS 动画、组件选择器、backdrop-filter）、组件优化（HistoryModal 缓存、IPC 批量）、工程改进（Tauri API 封装、bundle 分析、平台检测）。

**Tech Stack:** React 18, Zustand, CSS Modules, Tauri 2, Vite

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/stores/timerStore.ts` | 修改 | 添加 `useTimerUpdater` hook，优化 `useElapsed`/`useProgress` 选择器 |
| `src/App.tsx` | 修改 | 移除 setInterval 轮询，改用事件驱动 auto-complete 和 `useTimerUpdater` |
| `src/components/TimerRing.tsx` | 修改 | 改用 rAF + `useTimerUpdater` 驱动时间显示 |
| `src/components/TimerRing.module.css` | 修改 | 移除 filter 动画，改用 opacity/transform；移除 `stroke-width` 变化；合并动画 |
| `src/components/Controls.tsx` | 修改 | 细粒度 Zustand 选择器 |
| `src/components/TitleBar.tsx` | 修改 | 细粒度 Zustand 选择器 |
| `src/components/HistoryModal.tsx` | 修改 | 细粒度选择器 + `useMemo` 缓存分组 |
| `src/components/SettingsPanel.tsx` | 修改 | 细粒度 Zustand 选择器 |
| `src/components/ContextMenu.module.css` | 修改 | 移除 backdrop-filter，改用纯色背景 |
| `src/styles/globals.css` | 修改 | 移除主容器 backdrop-filter，优化状态样式 |
| `src/stores/statsStore.ts` | 修改 | IPC 保存添加 debounce(500ms) |
| `src/lib/tauri.ts` | 新建 | 统一封装 Tauri API 调用 |
| `src/lib/platform.ts` | 修改 | 添加同步检测 `isTauriEnv` |
| `vite.config.ts` | 修改 | 添加 `rollup-plugin-visualizer` |

---

## 阶段 1：核心性能优化

### Task 1.1: 计时器驱动机制重构 — 添加 `useTimerUpdater` hook

**Files:**
- Modify: `src/stores/timerStore.ts` (末尾，在 `formatDuration` 之前)

- [ ] **Step 1: 在 timerStore.ts 末尾添加 `useTimerUpdater` hook**

```typescript
// 在 export function formatElapsed 之前添加
import { useState, useEffect, useMemo } from 'react';

// 使用 requestAnimationFrame 驱动计时器更新
// 仅 RUNNING 状态下运行，避免不必要的重渲染
export function useTimerUpdater() {
  const status = useTimerStore((s) => s.status);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'RUNNING') {
      // 非 RUNNING 状态时，根据当前状态计算固定值
      const { startedAt, pausedAt, cumulativePausedDuration, completedDuration, status: s } =
        useTimerStore.getState();
      if (s === 'COMPLETED' && completedDuration) {
        setElapsed(completedDuration);
      } else if (s === 'PAUSED' && startedAt && pausedAt) {
        setElapsed(pausedAt - startedAt - cumulativePausedDuration);
      } else {
        setElapsed(0);
      }
      return;
    }

    let rafId: number;
    const update = () => {
      const { startedAt, cumulativePausedDuration } = useTimerStore.getState();
      if (!startedAt) {
        setElapsed(0);
        return;
      }
      setElapsed(Date.now() - startedAt - cumulativePausedDuration);
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [status]);

  return elapsed;
}
```

- [ ] **Step 2: 优化 `useElapsed` 使用细粒度选择器**

```typescript
// 修改 useElapsed
export function useElapsed(): number {
  const status = useTimerStore((s) => s.status);
  const startedAt = useTimerStore((s) => s.startedAt);
  const pausedAt = useTimerStore((s) => s.pausedAt);
  const cumulativePausedDuration = useTimerStore((s) => s.cumulativePausedDuration);
  const completedDuration = useTimerStore((s) => s.completedDuration);

  return useMemo(() => {
    if (status === 'COMPLETED') {
      return completedDuration ?? 0;
    }
    if (status === 'IDLE' || !startedAt) return 0;
    const now = Date.now();
    const effectiveEnd = pausedAt ?? now;
    return Math.max(0, effectiveEnd - startedAt - cumulativePausedDuration);
  }, [status, startedAt, pausedAt, cumulativePausedDuration, completedDuration]);
}
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `cd "C:\Users\TianLutao\Documents\桌面计时小应用" && npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\TianLutao\Documents\桌面计时小应用"
git add src/stores/timerStore.ts
git commit -m "perf: add useTimerUpdater hook with rAF and optimize useElapsed selectors"
```

---

### Task 1.2: 重构 App.tsx — 移除 setInterval 轮询

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 移除 `setTick` state 和 250ms setInterval 逻辑**

替换 `App.tsx` 中的计时相关逻辑：

```typescript
// 1. 移除这行声明
const [, setTick] = useState(0);

// 2. 替换整个 250ms setInterval 的 useEffect
// 之前：
useEffect(() => {
  if (status !== 'RUNNING') return;
  const interval = setInterval(() => {
    setTick((n) => n + 1);
    // Auto-complete when elapsed reaches target duration
    const { startedAt, cumulativePausedDuration, pausedAt, targetDuration } =
      useTimerStore.getState();
    if (!startedAt) return;
    const now = Date.now();
    const effectiveEnd = pausedAt ?? now;
    const elapsed = effectiveEnd - startedAt - cumulativePausedDuration;
    if (elapsed >= targetDuration) {
      useTimerStore.getState().complete();
    }
  }, 250);
  return () => clearInterval(interval);
}, [status]);

// 之后：
useEffect(() => {
  if (status !== 'RUNNING') return;
  const { startedAt, targetDuration, cumulativePausedDuration } =
    useTimerStore.getState();
  if (!startedAt) return;

  // 计算目标结束时间戳
  const endAt = startedAt + targetDuration + cumulativePausedDuration;
  const remaining = endAt - Date.now();

  if (remaining <= 0) {
    useTimerStore.getState().complete();
    return;
  }

  // 使用 setTimeout 在目标时间到达时自动完成
  const timeout = setTimeout(() => {
    useTimerStore.getState().complete();
  }, remaining);

  return () => clearTimeout(timeout);
}, [status]);
```

- [ ] **Step 2: 移除 `setTick` 的 import（如果已不再使用）**

`useState` 仍然需要（contextMenu 等），所以只移除 `setTick` 的解构即可。

```typescript
// 之前
const [, setTick] = useState(0);
// 之后 — 直接删除此行
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "perf: replace setInterval polling with event-driven setTimeout for auto-complete"
```

---

### Task 1.3: TimerRing 使用 rAF 驱动 + 细粒度 Props

**Files:**
- Modify: `src/components/TimerRing.tsx`

- [ ] **Step 1: 修改 TimerRing 组件，移除 `elapsed` prop 依赖，改用 `useTimerUpdater`**

```typescript
// 之前 imports
// import { memo } from 'react';
// import { useProgress } from '../stores/timerStore';

// 之后
import { memo } from 'react';
import { useProgress, useTimerUpdater, formatElapsed } from '../stores/timerStore';

// 接口保持不变
interface TimerRingProps {
  progress: number;
  status: string;
  elapsed?: number; // 保留为可选，兼容现有调用
}

// 组件内部
function TimerRing({ progress: propProgress, status, elapsed: propElapsed }: TimerRingProps) {
  const rAFElapsed = useTimerUpdater();
  // 使用 rAF 驱动的 elapsed，如果不可用则回退到 prop
  const elapsed = status === 'RUNNING' ? rAFElapsed : (propElapsed ?? 0);
  const progress = status === 'RUNNING' ? useProgress() : propProgress;
  // ... 其余保持不变
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/TimerRing.tsx
git commit -m "perf: use rAF-driven elapsed in TimerRing component"
```

---

### Task 1.4: 优化 TimerRing CSS 动画

**Files:**
- Modify: `src/components/TimerRing.module.css`

- [ ] **Step 1: 修改 pulseGlow 动画，移除 filter 和 stroke-width 变化**

```css
/* 替换 pulseGlow 动画 */
@keyframes pulseGlow {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
```

- [ ] **Step 2: 修改 progressCircleRunning 类，移除 filter 动画**

```css
/* 替换前 */
.progressCircleRunning {
  stroke: url(#progressGradientActive);
  filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
  animation: pulseGlow 2s ease-in-out infinite;
}

/* 替换后 */
.progressCircleRunning {
  stroke: url(#progressGradientActive);
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
  animation: pulseGlow 2s ease-in-out infinite;
}
```

- [ ] **Step 3: 合并 labelPulse 为简单 opacity 动画（保持一致性）**

`labelPulse` 已经只使用 opacity，保持不变。但将 `innerLabelRunning` 的动画时间与 pulseGlow 对齐：

```css
/* 保持不变，但确认 pulseGlow 和 labelPulse 时间一致 */
.innerLabelRunning {
  color: var(--accent-tertiary);
  animation: labelPulse 2s ease-in-out infinite;
}
```

- [ ] **Step 4: 优化 bgBreath 动画，移除 stroke 变化改用 opacity**

```css
/* 替换前 */
@keyframes bgBreath {
  0%, 100% {
    stroke: rgba(99, 102, 241, 0.15);
  }
  50% {
    stroke: rgba(99, 102, 241, 0.25);
  }
}

/* 替换后 */
@keyframes bgBreath {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.8;
  }
}
```

同时修改 `.bgCircle` 类，移除 stroke 动画：

```css
.bgCircle {
  fill: none;
  stroke: rgba(99, 102, 241, 0.15);
  stroke-width: 4;
  animation: bgBreath 4s ease-in-out infinite;
}
```

- [ ] **Step 5: 删除 compact/mini 模式的冗余 pulseGlow 变体**

```css
/* 删除 containerCompact 和 containerMini 相关的 pulseGlowCompact / pulseGlowMini 动画 */
/* 以及它们对应的 @keyframes */

/* 保留容器尺寸类，但移除动画相关 */
.containerCompact .progressCircleRunning {
  animation: pulseGlow 2s ease-in-out infinite;
}

.containerMini .progressCircleRunning {
  animation: pulseGlow 2s ease-in-out infinite;
}
```

- [ ] **Step 6: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/components/TimerRing.module.css
git commit -m "perf: optimize CSS animations - remove filter and stroke-width animations"
```

---

### Task 1.5: 细粒度 Zustand 选择器 — Controls

**Files:**
- Modify: `src/components/Controls.tsx`

- [ ] **Step 1: 替换全局 store 订阅为细粒度选择器**

```typescript
// 之前
const { status, start, pause, resume, stop } = useTimerStore();

// 之后
const status = useTimerStore((s) => s.status);
const start = useTimerStore((s) => s.start);
const pause = useTimerStore((s) => s.pause);
const resume = useTimerStore((s) => s.resume);
const stop = useTimerStore((s) => s.stop);
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/Controls.tsx
git commit -m "perf: use fine-grained Zustand selectors in Controls"
```

---

### Task 1.6: 细粒度 Zustand 选择器 — TitleBar

**Files:**
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: 替换全局 store 订阅为细粒度选择器**

```typescript
// 之前
const { alwaysOnTop, toggleAlwaysOnTop, recentSubjects, addRecentSubject } = useSettingsStore();
const { subject, setSubject, status } = useTimerStore();

// 之后
const alwaysOnTop = useSettingsStore((s) => s.alwaysOnTop);
const toggleAlwaysOnTop = useSettingsStore((s) => s.toggleAlwaysOnTop);
const recentSubjects = useSettingsStore((s) => s.recentSubjects);
const addRecentSubject = useSettingsStore((s) => s.addRecentSubject);
const subject = useTimerStore((s) => s.subject);
const setSubject = useTimerStore((s) => s.setSubject);
const status = useTimerStore((s) => s.status);
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/TitleBar.tsx
git commit -m "perf: use fine-grained Zustand selectors in TitleBar"
```

---

### Task 1.7: 细粒度 Zustand 选择器 — SettingsPanel

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: 替换全局 store 订阅为细粒度选择器**

```typescript
// 之前
const {
  targetDuration,
  setTargetDuration,
  alwaysOnTop,
  toggleAlwaysOnTop,
  notificationEnabled,
  toggleNotification,
  globalShortcutsEnabled,
  toggleGlobalShortcuts,
} = useSettingsStore();

// 之后
const targetDuration = useSettingsStore((s) => s.targetDuration);
const setTargetDuration = useSettingsStore((s) => s.setTargetDuration);
const alwaysOnTop = useSettingsStore((s) => s.alwaysOnTop);
const toggleAlwaysOnTop = useSettingsStore((s) => s.toggleAlwaysOnTop);
const notificationEnabled = useSettingsStore((s) => s.notificationEnabled);
const toggleNotification = useSettingsStore((s) => s.toggleNotification);
const globalShortcutsEnabled = useSettingsStore((s) => s.globalShortcutsEnabled);
const toggleGlobalShortcuts = useSettingsStore((s) => s.toggleGlobalShortcuts);
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "perf: use fine-grained Zustand selectors in SettingsPanel"
```

---

### Task 1.8: 优化 backdrop-filter 使用

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/components/ContextMenu.module.css`

- [ ] **Step 1: 移除主容器 backdrop-filter**

```css
/* 在 globals.css 中修改 .app-container */
.app-container {
  height: 100%;
  background: var(--glass-bg);
  /* 删除以下两行 */
  /* backdrop-filter: blur(24px) saturate(180%); */
  /* -webkit-backdrop-filter: blur(24px) saturate(180%); */
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 8px 40px rgba(0, 0, 0, 0.4);
  transition: background var(--duration-slow) var(--ease-out),
              border-color var(--duration-slow) var(--ease-out),
              box-shadow var(--duration-slow) var(--ease-out);
}
```

- [ ] **Step 2: 优化 app-running 状态的 box-shadow**

```css
/* 移除 inset box-shadow，它触发布局重绘 */
.app-running {
  border-color: rgba(99, 102, 241, 0.2);
  box-shadow: 
    0 0 0 1px rgba(99, 102, 241, 0.1),
    0 8px 40px rgba(0, 0, 0, 0.4);
  /* 删除: inset 0 0 80px rgba(99, 102, 241, 0.03); */
}
```

- [ ] **Step 3: 优化 app-completed 状态的 box-shadow**

```css
.app-completed {
  border-color: rgba(16, 185, 129, 0.2);
  box-shadow: 
    0 0 0 1px rgba(16, 185, 129, 0.1),
    0 8px 40px rgba(0, 0, 0, 0.4);
  /* 删除: inset 0 0 60px rgba(16, 185, 129, 0.02); */
  animation: completedFlash 0.6s var(--ease-out);
}
```

- [ ] **Step 4: ContextMenu 使用纯色背景替代 backdrop-filter**

```css
/* 在 ContextMenu.module.css 中替换 */
.menu {
  position: fixed;
  min-width: 160px;
  background: rgba(20, 20, 35, 0.95);
  /* 删除 backdrop-filter 相关行 */
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) 0;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 8px 32px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.12s ease-out;
  z-index: 1000;
}
```

- [ ] **Step 5: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css src/components/ContextMenu.module.css
git commit -m "perf: optimize backdrop-filter usage - remove from container, use solid bg for context menu"
```

---

## 阶段 2：组件优化

### Task 2.1: HistoryModal 细粒度选择器 + useMemo 缓存

**Files:**
- Modify: `src/components/HistoryModal.tsx`

- [ ] **Step 1: 替换全局 store 订阅为细粒度选择器，添加 useMemo 缓存分组**

```typescript
// 之前
const { sessions, todayTotal, currentStreak, deleteSession, clearAllSessions } = useStatsStore();

// 之后
const sessions = useStatsStore((s) => s.sessions);
const todayTotal = useStatsStore((s) => s.todayTotal);
const currentStreak = useStatsStore((s) => s.currentStreak);
const deleteSession = useStatsStore((s) => s.deleteSession);
const clearAllSessions = useStatsStore((s) => s.clearAllSessions);
```

- [ ] **Step 2: 添加 useMemo 缓存排序和分组逻辑**

```typescript
// 在组件内部，hooks 区域
import { memo, useState, useMemo } from 'react';

// 替换：
// const sortedSessions = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
// const groupedSessions: GroupedSessions[] = [];
// const dateGroups = new Map<string, typeof sessions>();
// ...

// 为：
const groupedSessions = useMemo(() => {
  const sorted = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const groups: GroupedSessions[] = [];
  const dateGroups = new Map<string, typeof sessions>();

  for (const session of sorted) {
    const dateKey = new Date(session.endedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(session);
  }

  for (const [date, dateSessions] of dateGroups) {
    groups.push({
      date,
      sessions: dateSessions,
      totalMs: dateSessions.reduce((sum, s) => sum + s.duration, 0),
    });
  }

  return groups;
}, [sessions]);
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/HistoryModal.tsx
git commit -m "perf: fine-grained selectors and useMemo caching in HistoryModal"
```

---

### Task 2.2: IPC 批量化 — debounce 持久化

**Files:**
- Modify: `src/stores/statsStore.ts`

- [ ] **Step 1: 添加 debounce 工具函数和批量持久化**

在文件顶部添加：

```typescript
// 简单的 debounce 实现
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
```

- [ ] **Step 2: 修改 `persistSessions` 调用为 debounce 版本**

在 `addSession`、`deleteSession`、`clearAllSessions` 中，将直接调用 `persistSessions` 改为调用 debounced 版本：

```typescript
// 在文件末尾，定义 debounced 版本
const debouncedPersistSessions = debounce(async (sessions: FocusSession[]) => {
  try {
    const invoke = await getInvoke();
    if (!invoke) return;

    const records: SessionRecord[] = sessions.map((s) => ({
      id: s.id,
      subject: s.subject,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      duration_seconds: Math.floor(s.duration / 1000),
      targetDuration: s.targetDuration,
    }));

    const total_seconds = records.reduce((sum, r) => sum + r.duration_seconds, 0);

    await invoke('save_study_data', {
      data: { records, total_seconds },
    });
  } catch (error) {
    console.error('Failed to persist sessions via Tauri:', error);
  }
}, 500);
```

- [ ] **Step 3: 替换 `addSession`、`deleteSession`、`clearAllSessions` 中的 `persistSessions` 调用**

```typescript
// addSession 中
// 之前: persistSessions(get().sessions);
// 之后: debouncedPersistSessions(get().sessions);

// deleteSession 中
// 之前: persistSessions(get().sessions);
// 之后: debouncedPersistSessions(get().sessions);

// clearAllSessions 中
// 之前: persistSessions([]);
// 之后: debouncedPersistSessions([]);
```

- [ ] **Step 4: 保留原始的 `persistSessions` 函数（用于 `loadSessionsFromBackend` 中的迁移调用）**

`persistSessions` 仍然需要在迁移时直接调用，不要删除它。

- [ ] **Step 5: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/stores/statsStore.ts
git commit -m "perf: add debounce to IPC session persistence - batch saves within 500ms"
```

---

## 阶段 3：工程改进

### Task 3.1: 统一 Tauri API 封装

**Files:**
- Create: `src/lib/tauri.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: 创建 `src/lib/tauri.ts`**

```typescript
/**
 * Unified Tauri API wrapper
 * Provides lazy-initialized singleton access to Tauri APIs
 */

let tauriWindowPromise: Promise<any> | null = null;

async function getWindow() {
  if (!tauriWindowPromise) {
    tauriWindowPromise = import('@tauri-apps/api/window').then((m) => m.getCurrentWindow());
  }
  return tauriWindowPromise;
}

export async function minimizeWindow() {
  const win = await getWindow();
  return win.minimize();
}

export async function closeWindow() {
  const win = await getWindow();
  return win.close();
}

export async function setAlwaysOnTop(enabled: boolean) {
  const win = await getWindow();
  return win.setAlwaysOnTop(enabled);
}

export async function onCloseRequested(handler: (event: { preventDefault: () => void }) => void) {
  const win = await getWindow();
  return win.onCloseRequested(handler);
}
```

- [ ] **Step 2: 更新 `App.tsx` 使用新封装**

在 `App.tsx` 中：

```typescript
// 在文件顶部添加导入
import { minimizeWindow, closeWindow, setAlwaysOnTop, onCloseRequested } from './lib/tauri';

// 替换 handleMinimize/handleClose（如果存在）
// 替换 window 关闭处理
// 在 onCloseRequested 的 useEffect 中：
// 之前: const { getCurrentWindow } = await import('@tauri-apps/api/window');
//       const appWindow = getCurrentWindow();
//       const unlisten = await appWindow.onCloseRequested(...);
// 之后: const unlisten = await onCloseRequested(...);
```

- [ ] **Step 3: 更新 `TitleBar.tsx` 使用新封装**

```typescript
// 在文件顶部添加导入
import { minimizeWindow, closeWindow } from '../lib/tauri';

// 替换 handleMinimize
// 之前:
// const handleMinimize = async () => {
//   if (!inTauri) return;
//   const { getCurrentWindow } = await import('@tauri-apps/api/window');
//   const appWindow = getCurrentWindow();
//   await appWindow.minimize();
// };
// 之后:
const handleMinimize = async () => {
  if (!inTauri) return;
  await minimizeWindow();
};

// 替换 handleClose 同样
```

- [ ] **Step 4: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/lib/tauri.ts src/App.tsx src/components/TitleBar.tsx
git commit -m "refactor: unify Tauri API calls into singleton wrapper"
```

---

### Task 3.2: 添加 bundle 分析工具

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: 安装 `rollup-plugin-visualizer`**

Run: `cd "C:\Users\TianLutao\Documents\桌面计时小应用" && npm install --save-dev rollup-plugin-visualizer`

- [ ] **Step 2: 更新 `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // 仅在 build 时启用分析
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    })] : []),
  ],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/target/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

- [ ] **Step 3: 验证构建**

Run: `cd "C:\Users\TianLutao\Documents\桌面计时小应用" && npm run build`
Expected: 构建成功，无错误

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json
git commit -m "chore: add rollup-plugin-visualizer for bundle analysis"
```

---

### Task 3.3: 平台检测优化 — 添加同步检测

**Files:**
- Modify: `src/lib/platform.ts`

- [ ] **Step 1: 添加同步检测常量**

```typescript
// 在文件末尾添加
/**
 * Synchronous Tauri environment check
 * Safe to use after module initialization (window is defined)
 * Returns true/false immediately without async overhead
 */
export const isTauriEnv: boolean =
  typeof window !== 'undefined' && '__TAURI__' in window;
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/lib/platform.ts
git commit -m "perf: add synchronous isTauriEnv check for non-async contexts"
```

---

## 验证计划

### 最终验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `npm run typecheck`
Expected: 无类型错误

- [ ] **Step 2: 运行构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 检查所有提交**

Run: `git log --oneline -20`
Expected: 显示所有 12 个优化提交

- [ ] **Step 4: 推送到 GitHub**

```bash
git push origin main
```

---

## 执行顺序

1. Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8（阶段 1，按顺序）
2. Task 2.1 → 2.2（阶段 2，依赖阶段 1 完成）
3. Task 3.1 → 3.2 → 3.3（阶段 3，独立）
4. 最终验证
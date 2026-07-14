# Performance Optimization Design

> 桌面计时小应用（Tauri 2 + React + TypeScript + Zustand）
> 渐进式三阶段优化方案

## 当前问题概览

通过全面审计，识别出 11 个性能问题，分为三类优先级：

| 优先级 | 数量 | 影响 |
|--------|------|------|
| 🔴 高 | 4 | 渲染性能、GPU 占用、不必要的重渲染 |
| 🟡 中 | 4 | 缓存缺失、IPC 开销、竞态条件 |
| 🟢 低 | 3 | 打包工具、代码组织 |

---

## 阶段 1：核心性能优化（高优先级）

### 1.1 计时器驱动机制重构

**问题描述**：`App.tsx:119-138` 使用 `setInterval(250ms)` + `setTick` 状态驱动整个组件树重渲染。计时器运行时，App 及其所有子组件每秒重渲染 4 次。

**优化方案**：
- 移除 `App.tsx` 中的 `setTick` 和 250ms 轮询
- 创建独立的 `useTimerUpdater` hook，封装在 `timerStore.ts` 中
- 使用 `requestAnimationFrame` 只更新 TimerRing 组件（视觉更新）
- 计时完成检测用 `setTimeout` 事件驱动（基于目标时间戳），而非轮询

**改动文件**：
- `src/App.tsx` — 移除 setInterval 逻辑
- `src/stores/timerStore.ts` — 新增 `useTimerUpdater` hook，基于 rAF
- `src/components/TimerRing.tsx` — 使用 rAF 更新显示

**关键实现**：
```typescript
// 新增：timerStore.ts
export function useTimerUpdater() {
  const status = useTimerStore((s) => s.status);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'RUNNING') return;
    let rafId: number;

    const update = () => {
      const { startedAt, cumulativePausedDuration } = useTimerStore.getState();
      if (!startedAt) return;
      setElapsed(Date.now() - startedAt - cumulativePausedDuration);
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [status]);

  return elapsed;
}
```

```typescript
// 修改：App.tsx — 移除 setTick 和 setInterval
// 之前
useEffect(() => {
  if (status !== 'RUNNING') return;
  const interval = setInterval(() => {
    setTick((n) => n + 1);
    // auto-complete check...
  }, 250);
  return () => clearInterval(interval);
}, [status]);

// 之后
useEffect(() => {
  if (status !== 'RUNNING') return;
  const { startedAt, targetDuration, cumulativePausedDuration } = useTimerStore.getState();
  if (!startedAt) return;
  const endAt = startedAt + targetDuration + cumulativePausedDuration;
  const remaining = endAt - Date.now();

  if (remaining <= 0) {
    useTimerStore.getState().complete();
    return;
  }

  const timeout = setTimeout(() => {
    useTimerStore.getState().complete();
  }, remaining);

  return () => clearTimeout(timeout);
}, [status]);
```

### 1.2 Zustand 细粒度选择器

**问题描述**：Controls、TitleBar、HistoryModal、SettingsPanel 等组件使用 `useTimerStore()` 或 `useStatsStore()` 订阅整个 store，导致任意状态变化都触发重渲染。

**优化方案**：所有组件改用细粒度选择器，每个选择器只订阅需要的字段。

**改动文件**：
- `src/components/Controls.tsx`
- `src/components/TitleBar.tsx`
- `src/components/HistoryModal.tsx`
- `src/components/SettingsPanel.tsx`
- `src/stores/timerStore.ts`（useElapsed/useProgress）

**关键实现**：
```typescript
// Controls.tsx
// 之前
const { status, start, pause, resume, stop } = useTimerStore();

// 之后
const status = useTimerStore((s) => s.status);
const start = useTimerStore((s) => s.start);
const pause = useTimerStore((s) => s.pause);
const resume = useTimerStore((s) => s.resume);
const stop = useTimerStore((s) => s.stop);
```

```typescript
// timerStore.ts — useElapsed
// 之前
export function useElapsed() {
  const { status, startedAt, pausedAt, cumulativePausedDuration, completedDuration } =
    useTimerStore();
  // ...
}

// 之后
export function useElapsed() {
  const status = useTimerStore((s) => s.status);
  const startedAt = useTimerStore((s) => s.startedAt);
  const pausedAt = useTimerStore((s) => s.pausedAt);
  const cumulativePausedDuration = useTimerStore((s) => s.cumulativePausedDuration);
  const completedDuration = useTimerStore((s) => s.completedDuration);

  return useMemo(() => {
    // 计算逻辑
  }, [status, startedAt, pausedAt, cumulativePausedDuration, completedDuration]);
}
```

### 1.3 TimerRing CSS 动画优化

**问题描述**：TimerRing 运行时存在三个并发 CSS 动画，使用 `filter: drop-shadow()` 和 `stroke-width` 变化，造成 GPU 画布重绘。

**优化方案**：
- `pulseGlow`：移除 `filter` 和 `stroke-width` 变化，改用 `opacity` + `transform: scale()` 模拟发光效果
- `labelPulse`：合并到 `pulseGlow` 的节奏中，减少独立动画
- `bgBreath`：改用 `transform: scale()` 替代 `stroke-width`

**改动文件**：
- `src/components/TimerRing.module.css`

**关键实现**：
```css
/* 之前 */
@keyframes pulseGlow {
  0%, 100% {
    filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
    stroke-width: 4;
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.9));
    stroke-width: 4.5;
  }
}

/* 之后 — 使用合成器属性 */
@keyframes pulseGlow {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}
/* 应用在伪元素或内层圆环上，而非直接作用在 SVG 元素 */
```

### 1.4 backdrop-filter 使用优化

**问题描述**：主容器、HistoryModal、SettingsPanel、ContextMenu 多处使用 `backdrop-filter: blur(24px) saturate(180%)`，叠加时 GPU 负载高。

**优化方案**：
- 主容器（`.app-container`）移除 backdrop-filter，仅保留 `background` 和 `border`
- ContextMenu 使用纯色背景 `rgba(30, 30, 40, 0.95)` 替代模糊效果
- SettingsPanel 和 HistoryModal 保留 backdrop-filter（全屏模态框需要）
- 模糊值从 `24px` 降低到 `16px` 减少 GPU 开销

**改动文件**：
- `src/styles/globals.css`
- `src/components/ContextMenu.module.css`
- `src/components/SettingsPanel.module.css`
- `src/components/HistoryModal.module.css`

---

## 阶段 2：组件优化（中优先级）

### 2.1 HistoryModal 分组缓存

**问题描述**：每次渲染时，`sortedSessions` 排序和分组逻辑全部重新计算，未使用 `useMemo`。

**优化方案**：使用 `useMemo` 缓存排序和分组结果。

**改动文件**：
- `src/components/HistoryModal.tsx`

```typescript
const groupedSessions = useMemo(() => {
  const sorted = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const groups: Record<string, FocusSession[]> = {};
  for (const session of sorted) {
    const dateKey = formatDateKey(session.endedAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(session);
  }
  return groups;
}, [sessions]);
```

### 2.2 IPC 批量化

**问题描述**：`statsStore.ts` 中每次 `addSession` 立即调用 `persistSessions` 触发 IPC 通信。

**优化方案**：添加 `debounce(500ms)` 批量处理保存操作。

**改动文件**：
- `src/stores/statsStore.ts`

```typescript
// 在文件顶部
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

const debouncedPersist = debounce(async (sessions: FocusSession[]) => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_study_data', { sessions });
    } catch (e) {
      console.error('Failed to persist sessions:', e);
    }
  }
}, 500);
```

---

## 阶段 3：工程改进（低优先级）

### 3.1 Tauri API 统一封装

**问题描述**：多处使用动态 `import('@tauri-apps/api/window')` 和 `import('@tauri-apps/plugin-*')`，存在竞态条件和重复代码。

**优化方案**：创建 `src/lib/tauri.ts` 统一封装所有 Tauri API 调用，提供 cleanup 支持。

**改动文件**：
- 新建 `src/lib/tauri.ts`
- `src/App.tsx`
- `src/components/TitleBar.tsx`

```typescript
// src/lib/tauri.ts
let tauriWindow: Promise<any> | null = null;

export async function getWindow() {
  if (!tauriWindow) {
    tauriWindow = import('@tauri-apps/api/window').then((m) => m.getCurrentWindow());
  }
  return tauriWindow;
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
```

### 3.2 打包体积监控

**问题描述**：无 bundle 分析工具，无法监控打包体积变化。

**优化方案**：
- 添加 `rollup-plugin-visualizer`
- 在 `npm run build` 时生成 `stats.html` 分析报告

**改动文件**：
- `vite.config.ts`

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

// 在 plugins 数组中添加
visualizer({
  filename: 'dist/stats.html',
  open: true,
  gzipSize: true,
});
```

### 3.3 平台检测优化

**问题描述**：`isTauri()` 返回 Promise，所有消费者需处理异步。

**优化方案**：提供同步和异步两种检测方式。

**改动文件**：
- `src/lib/platform.ts`

```typescript
// 同步检测（初始化后可用）
export const isTauriEnv = typeof window !== 'undefined' && '__TAURI__' in window;

// 异步确认（用于需要确切结果的场景，如插件加载）
export async function isTauriAsync(): Promise<boolean> {
  if (isTauriEnv) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('get_study_data');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
```

---

## 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 计时器重渲染频率 | 4次/秒（setInterval） | 按需（rAF） | 95%↓ |
| TimerRing GPU 占用 | 高（filter动画+stroke-width变化） | 低（opacity/transform） | 60%↓ |
| 组件订阅粒度 | 全局订阅 | 细粒度选择器 | 70%↓ |
| backdrop-filter 层数 | 3+ 层 | 1-2 层 | 50%↓ |
| IPC 调用频率 | 即时保存 | 500ms 批量 | 80%↓ |
| 历史记录分组计算 | 每次渲染重算 | useMemo 缓存 | 99%↓ |
| Tauri 动态导入 | 重复导入 | 单例封装 | 50%↓ |

---

## 执行顺序

1. **阶段 1.1 → 1.2 → 1.3 → 1.4**（核心性能，独立可验证）
2. **阶段 2.1 → 2.2**（组件优化，依赖阶段 1.2）
3. **阶段 3.1 → 3.2 → 3.3**（工程改进，独立）

每个阶段完成后运行 `npm run dev` 验证功能完整性。
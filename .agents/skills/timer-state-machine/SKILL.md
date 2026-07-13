---
name: timer-state-machine
description: >
  Timer core logic as a finite state machine for the study timer app.
  Use whenever implementing, debugging, or modifying timer behavior.
  CRITICAL: This skill defines the ONLY correct way to implement timing logic.
  Never use setInterval to decrement seconds—always use timestamp-based calculation.
  Covers state transitions, pause/resume, drift prevention, system sleep recovery,
  app restart persistence, and all edge cases.
---

# Timer State Machine — 计时核心状态机

本 Skill 定义计时器的核心逻辑，以有限状态机形式建模。这是最容易出错的模块，必须严格遵循规范。

---

## 1. 状态机模型

### 五种状态

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌───────┐      start()      ┌──────────┐                 │
│   │ IDLE  │ ────────────────► │ RUNNING  │                 │
│   └───────┘                   └──────────┘                 │
│       ▲                            │  │                     │
│       │                            │  │                     │
│       │ reset()              pause()│  │stop()              │
│       │                            │  │                     │
│       │                            ▼  ▼                     │
│       │                      ┌──────────┐                  │
│       │                      │  PAUSED  │                  │
│       │                      └──────────┘                  │
│       │                            │                        │
│       │                      resume()│                      │
│       │                            │                        │
│       │               stop()       │                        │
│       │    ◄───────────────────────┘                        │
│       │                            │                        │
│  completed/cancelled              │stop()                  │
│       │                            ▼                        │
│       │                      ┌────────────┐                │
│       └──────────────────────│ CANCELLED  │◄───────┐       │
│                              └────────────┘        │       │
│                                                    │       │
│                              ┌────────────┐        │       │
│                              │ COMPLETED  │──────stop()────┤
│                              └────────────┘                │
│                                    │                        │
│                              reset()│                       │
│                                    ▼                        │
│                              back to IDLE                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 状态定义

| 状态 | 含义 | 可转换到 |
|---|---|---|
| `IDLE` | 未开始，计时器归零 | `RUNNING` |
| `RUNNING` | 计时中，时间递增 | `PAUSED`, `COMPLETED`, `CANCELLED` |
| `PAUSED` | 已暂停，时间冻结 | `RUNNING`, `CANCELLED` |
| `COMPLETED` | 达到目标时长，自动完成 | `IDLE` |
| `CANCELLED` | 用户手动终止，保存记录 | `IDLE` |

### 合法状态转换

```
IDLE      ──start()──►  RUNNING
RUNNING   ──pause()──►  PAUSED
PAUSED    ──resume()─►  RUNNING
RUNNING   ──complete()► COMPLETED  (自动触发)
RUNNING   ──stop()───►  CANCELLED  (用户操作)
PAUSED    ──stop()───►  CANCELLED  (用户操作)
COMPLETED ──reset()──►  IDLE
CANCELLED ──reset()──►  IDLE
```

### 禁止的转换

```
IDLE      ──✗──►  PAUSED       (未开始不能暂停)
IDLE      ──✗──►  COMPLETED    (未开始不能完成)
IDLE      ──✗──►  CANCELLED    (未开始不能取消)
PAUSED    ──✗──►  COMPLETED    (暂停中不能自动完成)
RUNNING   ──✗──►  IDLE         (必须先 stop 或 complete)
```

---

## 2. 数据模型

### 核心时间戳

```typescript
interface TimerState {
  // 状态
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  
  // 时间基准（毫秒时间戳）
  startedAt: number | null;        // 开始时间（Date.now()）
  targetDuration: number;          // 目标时长（毫秒，默认 3600000 = 1小时）
  
  // 暂停相关
  pausedAt: number | null;         // 暂停时刻（Date.now()）
  cumulativePausedDuration: number; // 累计暂停时长（毫秒）
  
  // 计算属性（不存储，实时计算）
  // elapsed = now - startedAt - cumulativePausedDuration
  // remaining = targetDuration - elapsed
}
```

### 为什么不用 `elapsedSeconds`？

❌ **错误做法：**
```javascript
let elapsedSeconds = 0;
setInterval(() => {
  elapsedSeconds++;
  updateDisplay(elapsedSeconds);
}, 1000);
```

**问题：**
1. `setInterval` 不精确——最小化、后台标签页、系统休眠时会被节流或暂停
2. 累积误差——每次回调的实际延迟可能 >1000ms
3. 无法处理系统时间修改
4. 无法恢复正确的计时

✅ **正确做法：**
```javascript
// 存储时间基准
let startedAt = Date.now();
let pausedAt = null;
let cumulativePausedDuration = 0;

// 实时计算当前时长
function getElapsed() {
  if (status === 'IDLE') return 0;
  if (status === 'PAUSED') {
    return pausedAt - startedAt - cumulativePausedDuration;
  }
  // RUNNING, COMPLETED, CANCELLED
  return Date.now() - startedAt - cumulativePausedDuration;
}

// UI 更新（只是显示，不影响计时准确性）
setInterval(() => {
  const elapsed = getElapsed();
  updateDisplay(elapsed);
}, 100); // 更高频更新，但误差不累积
```

---

## 3. 核心算法

### 开始计时

```javascript
function start() {
  if (state.status !== 'IDLE') {
    console.error('Cannot start: current status is', state.status);
    return;
  }
  
  state.startedAt = Date.now();
  state.pausedAt = null;
  state.cumulativePausedDuration = 0;
  state.status = 'RUNNING';
  
  persistState(); // 持久化，防崩溃
  startUIUpdate();
}
```

### 暂停

```javascript
function pause() {
  if (state.status !== 'RUNNING') {
    console.error('Cannot pause: current status is', state.status);
    return;
  }
  
  state.pausedAt = Date.now();
  state.status = 'PAUSED';
  
  persistState();
  stopUIUpdate();
}
```

### 继续

```javascript
function resume() {
  if (state.status !== 'PAUSED') {
    console.error('Cannot resume: current status is', state.status);
    return;
  }
  
  // 累加本次暂停时长
  const pauseDuration = Date.now() - state.pausedAt;
  state.cumulativePausedDuration += pauseDuration;
  
  state.pausedAt = null;
  state.status = 'RUNNING';
  
  persistState();
  startUIUpdate();
}
```

### 停止（用户手动终止）

```javascript
function stop() {
  if (state.status !== 'RUNNING' && state.status !== 'PAUSED') {
    console.error('Cannot stop: current status is', state.status);
    return;
  }
  
  const elapsed = getElapsed();
  
  state.status = 'CANCELLED';
  
  // 保存学习记录
  saveStudySession({
    date: getDateString(state.startedAt),
    duration_seconds: Math.floor(elapsed / 1000),
    subject: currentSubject,
  });
  
  persistState();
  stopUIUpdate();
  
  // 重置到 IDLE
  setTimeout(() => reset(), 100);
}
```

### 完成（自动触发）

```javascript
function checkCompletion() {
  if (state.status !== 'RUNNING') return;
  
  const elapsed = getElapsed();
  
  if (elapsed >= state.targetDuration) {
    state.status = 'COMPLETED';
    
    // 保存学习记录
    saveStudySession({
      date: getDateString(state.startedAt),
      duration_seconds: Math.floor(elapsed / 1000),
      subject: currentSubject,
    });
    
    // 发送通知
    showNotification('学习目标达成！');
    
    persistState();
    stopUIUpdate();
    
    // 可选：自动重置或等待用户确认
    setTimeout(() => reset(), 3000);
  }
}

// 在 UI 更新循环中检查
function updateLoop() {
  if (state.status === 'RUNNING') {
    const elapsed = getElapsed();
    updateDisplay(elapsed);
    checkCompletion();
  }
}
```

### 重置

```javascript
function reset() {
  state.status = 'IDLE';
  state.startedAt = null;
  state.pausedAt = null;
  state.cumulativePausedDuration = 0;
  
  persistState();
  stopUIUpdate();
  updateDisplay(0);
}
```

### 获取当前时长

```javascript
function getElapsed() {
  if (state.status === 'IDLE') {
    return 0;
  }
  
  if (state.status === 'PAUSED' && state.pausedAt !== null) {
    // 暂停中：时长 = 暂停时刻 - 开始时刻 - 累计暂停时长
    return state.pausedAt - state.startedAt - state.cumulativePausedDuration;
  }
  
  // RUNNING / COMPLETED / CANCELLED
  // 时长 = 当前时刻 - 开始时刻 - 累计暂停时长
  return Date.now() - state.startedAt - state.cumulativePausedDuration;
}
```

---

## 4. 边缘情况处理

### 系统休眠后恢复

**问题：** 系统休眠时

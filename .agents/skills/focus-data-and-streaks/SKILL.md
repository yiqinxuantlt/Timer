---
name: focus-data-and-streaks
description: >
  Data models and statistics rules for the study timer app.
  Use whenever implementing data persistence, calculating statistics,
  handling streak logic, defining export formats, or modifying data structures.
  Defines all entities (FocusSession, DailySummary, Task, AppSettings, TimerPreset),
  calculation rules (today's focus, streak days, minimum valid duration),
  and storage strategy (Store for settings, SQLite for long-term data).
  MUST be consulted before any database schema change or statistics logic.
---

# Focus Data and Streaks — 记录与统计

本 Skill 定义学习计时器的数据模型、统计规则和持久化策略。所有涉及数据存储、统计计算、连续学习天数、数据导入导出的逻辑都必须遵循本规范。

---

## 1. 数据实体定义

### 1.1 FocusSession（专注会话）

核心记录实体，每次计时结束产生一条记录。

```typescript
interface FocusSession {
  id: string;                    // UUID v4
  taskId?: string | null;        // 关联任务 ID（可选）
  
  // 计时模式
  mode: 'focus' | 'pomodoro' | 'countup';
  
  // 时长
  plannedSeconds: number;        // 计划时长（目标）
  actualSeconds: number;         // 实际时长（真实）
  
  // 时间戳（ISO 8601）
  startedAt: string;             // 开始时间 "2025-01-15T14:30:00Z"
  endedAt: string;               // 结束时间 "2025-01-15T15:30:00Z"
  
  // 状态
  status: 'completed' | 'cancelled';
  
  // 元数据
  subject: string;               // 科目/任务名称
  notes?: string | null;         // 备注（可选）
  
  // 系统
  createdAt: string;             // 记录创建时间
  updatedAt: string;             // 记录更新时间
  timezone: string;              // 用户时区 "Asia/Shanghai"
  device: string;                // 设备标识
}
```

**字段说明：**

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 唯一标识，用于查询和删除 |
| `taskId` | ❌ | 关联到 Task 表，实现"按任务统计" |
| `mode` | ✅ | focus = 目标导向；pomodoro = 番茄钟；countup = 自由计时 |
| `plannedSeconds` | ✅ | 计划时长（focus/pomodoro 模式有意义） |
| `actualSeconds` | ✅ | 实际时长，计算统计的核心 |
| `startedAt` | ✅ | 用于"开始日期"归属、跨午夜判断 |
| `endedAt` | ✅ | 用于完成时刻记录 |
| `status` | ✅ | completed = 达到目标或手动结束并保存；cancelled = 用户主动取消不保存 |
| `subject` | ✅ | 用户输入的科目名称 |
| `timezone` | ✅ | 处理跨时区统计 |

---

### 1.2 DailySummary（每日汇总）

预计算实体，避免每次查询时聚合大量 Session。

```typescript
interface DailySummary {
  id: string;                    // 格式：YYYY-MM-DD
  date: string;                  // "2025-01-15"
  
  // 统计数据
  totalSeconds: number;          // 当日总专注时长
  sessionCount: number;          // 当日专注次数
  completedCount: number;        // 完成次数（达到目标）
  cancelledCount: number;        // 取消次数
  
  // 科目分布
  subjects: SubjectBreakdown[];  // 按科目分解
  
  // 连续学习
  streakDayNumber: number | null; // 这是连续学习的第几天（null 表示中断）
  
  // 元数据
  createdAt: string;
  updatedAt: string;
}

interface SubjectBreakdown {
  subject: string;
  seconds: number;
  sessionCount: number;
}
```

**更新规则：**

- 每次 FocusSession 创建/删除时，更新对应日期的 DailySummary
- DailySummary 由后端自动维护，前端只读取

---

### 1.3 Task（任务）

可选实体，用于"计划学习任务"场景。

```typescript
interface Task {
  id: string;
  
  // 基本信息
  title: string;                 // 任务名称
  description?: string | null;   // 任务描述
  
  // 计划
  plannedSeconds: number;        // 计划专注时长
  deadline?: string | null;      // 截止日期
  
  // 进度
  completedSeconds: number;      // 已完成时长
  sessionCount: number;          // 已完成会话数
  
  // 状态
  status: 'active' | 'completed' | 'archived';
  
  // 元数据
  createdAt: string;
  updatedAt: string;
}
```

**用途：**

- 用户可以创建"复习数学"任务，计划 10 小时
- 每次 FocusSession 可关联到该 Task
- 统计可按 Task 分组查看进度

---

### 1.4 TimerPreset（计时预设）

用户自定义计时模板。

```typescript
interface TimerPreset {
  id: string;
  
  // 基本信息
  name: string;                  // 预设名称（如"番茄钟"、"长专注"）
  
  // 配置
  mode: 'focus' | 'pomodoro' | 'countup';
  targetSeconds: number;         // 目标时长
  
  // 番茄钟专用
  pomodoroConfig?: {
    workSeconds: number;         // 工作时长（默认 1500 = 25分钟）
    breakSeconds: number;        // 短休息时长（默认 300 = 5分钟）
    longBreakSeconds: number;    // 长休息时长（默认 900 = 15分钟）
    cyclesBeforeLongBreak: number; // 长休息前的工作周期数（默认 4）
  } | null;
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;            // 是否为内置预设
}
```

**示例：**

```typescript
const presets: TimerPreset[] = [
  {
    id: 'preset-pomodoro',
    name: '番茄钟',
    mode: 'pomodoro',
    targetSeconds: 1500,
    pomodoroConfig: {
      workSeconds: 1500,
      breakSeconds: 300,
      longBreakSeconds: 900,
      cyclesBeforeLongBreak: 4,
    },
    isDefault: true,
  },
  {
    id: 'preset-focus-1h',
    name: '长专注',
    mode: 'focus',
    targetSeconds: 3600,
    pomodoroConfig: null,
    isDefault: true,
  },
  {
    id: 'preset-countup',
    name: '自由计时',
    mode: 'countup',
    targetSeconds: 0,            // 无目标
    pomodoroConfig: null,
    isDefault: true,
  },
];
```

---

### 1.5 AppSettings（应用设置）

```typescript
interface AppSettings {
  // 计时器
  defaultMode: 'focus' | 'pomodoro' | 'countup';
  defaultTargetSeconds: number;  // 默认目标时长
  
  // 通知
  notificationEnabled: boolean;
  notificationOnComplete: boolean;
  notificationOnMilestone: boolean;
  milestoneMinutes: number[];    // 阶段性提醒时间点 [15, 30, 45]
  
  // 系统托盘
  minimizeToTray: boolean;
  trayShowStats: boolean;
  
  // 自动启动
  autoStartEnabled: boolean;
  
  // 外观
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  windowPosition: { x: number; y: number } | null;
  windowSize: { width: number; height: number } | null;
  alwaysOnTop: boolean;
  
  // 统计
  minimumValidSeconds: number;   // 最短有效专注时间（默认 60）
  streakRequireCompleted: boolean; // 连续天数是否要求 completed 状态
  
  // 数据
  lastBackupAt: string | null;
  dataRetentionDays: number;     // 数据保留天数（默认 365）
  
  // 用户
  timezone: string;              // 用户时区
  locale: string;                // 语言
}
```

---

## 2. 统计计算规则

### 2.1 今日专注时长

**公式：**

```typescript
function calculateTodayFocus(date: string, sessions: FocusSession[]): number {
  return sessions
    .filter(s => s.startedAt.startsWith(date) && s.status === 'completed')
    .reduce((sum, s) => sum + s.actualSeconds, 0);
}
```

**规则：**

| 条件 | 是否计入 |
|---|---|
| `status === 'completed'` | ✅ 计入 |
| `status === 'cancelled'` | ❌ 不计入 |
| `actualSeconds >= minimumValidSeconds` | ✅ 计入 |
| `actualSeconds < minimumValidSeconds` | ❌ 不计入（无效会话） |
| 跨午夜会话 | ✅ 计入 **开始日期** |

**示例：**

```typescript
// 最低有效时长 = 60 秒
// Session A: 30 秒，completed → 不计入（太短）
// Session B: 90 秒，completed → 计入
// Session C: 3600 秒，cancelled → 不计入（取消）
// Session D: 跨午夜（23:50 - 00:10），startedAt = "2025-01-15T23:50:00"
//   → 计入 2025-01-15 的统计，不计入 2025-01-16
```

---

### 2.2 专注次数

**定义：** 满足以下条件的 Session 数量：
1. `status === 'completed'`
2. `actualSeconds >= minimumValidSeconds`

```typescript
function calculateSessionCount(date: string, sessions: FocusSession[]): number {
  return sessions.filter(s => 
    s.startedAt.startsWith(date) &&
    s.status === 'completed' &&
    s.actualSeconds >= minimumValidSeconds
  ).length;
}
```

---

### 2.3 最短有效专注时间

**目的：** 防止"点击开始后立即停止"产生无意义记录。

**默认值：** 60 秒（1 分钟）

**规则：**

| actualSeconds | 是否有效 | 是否保存 | 是否计入统计 |
|---|---|---|---|
| < 60 | ❌ 无效 | 不保存到数据库 | ❌ |
| 60 - 300 | ✅ 有效 | 保存 | ✅ |
| >= 300 | ✅ 有效 | 保存 | ✅ |

**实现：**

```typescript
function shouldSaveSession(session: FocusSession): boolean {
  return session.actualSeconds >= settings.minimumValidSeconds;
}
```

---

### 2.4 连续学习天数（Streak）

**定义：** 连续每天都至少完成一次有效专注会话的天数。

**算法：**

```typescript
function calculateStreak(today: string, summaries: DailySummary[]): number {
  // 从今天往前追溯
  let streak = 0;
  let currentDate = new Date(today);
  
  while (true) {
    const dateStr = formatDate(currentDate);
    const summary = summaries.find(s => s.date === dateStr);
    
    // 条件：当天有至少一次有效专注
    const hasValidFocus = summary && 
      summary.completedCount > 0 &&
      summary.totalSeconds >= settings.minimumValidSeconds;
    
    if (hasValidFocus) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // 中断
      break;
    }
    
    // 防止无限循环
    if (streak > 365) break;
  }
  
  return st

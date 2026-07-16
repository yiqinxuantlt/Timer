# 番茄钟模式设计规格

日期：2026-07-16  
状态：待用户审阅

## 1. 目标

在现有普通目标计时模式之外，增加可配置的番茄钟模式，降低手动切换专注与休息阶段的操作成本，同时保持现有时间戳计时、数据持久化和桌面窗口体验。

已确认的产品决策：

- 主界面提供“普通计时 / 番茄钟”模式切换。
- 设置面板提供番茄钟周期配置。
- 内置经典预设：专注 25 分钟、短休息 5 分钟、长休息 15 分钟，每 4 个专注阶段进入一次长休息。
- 每个阶段结束后自动停止、发送通知，并等待用户确认才开始下一阶段。
- 最小化、切换窗口、锁屏和系统休眠期间继续按真实时间运行。
- 只有专注阶段产生学习记录，休息阶段不计入统计。

## 2. 范围

### 包含

- 番茄钟模式的状态和阶段管理。
- 专注、短休息、长休息的时间戳计时。
- 阶段结束通知与页面内确认操作。
- 番茄钟设置持久化和旧数据兼容。
- 普通模式与番茄钟模式的切换限制。
- 普通模式和紧凑模式下的阶段状态展示。

### 不包含

- 系统级定时任务或应用完全退出后的后台唤醒。
- 云同步、账户和跨设备计划。
- 番茄钟任务日历、多任务队列或复杂报表。
- 自动跳过用户确认并直接进入下一阶段。

## 3. 方案选择

### 方案 A：扩展现有前端状态机（采用）

在现有 `timerStore` 上增加模式、阶段和轮次字段，继续使用时间戳计算与现有持久化链路。它不需要增加依赖，能直接复用当前的暂停、恢复、关闭保存和通知能力。

### 方案 B：Rust 后台调度器

由 Rust 负责阶段计时和通知，前端通过 Tauri 事件同步状态。后台可靠性更强，但需要额外的 IPC、权限和前后端一致性处理；对于当前单窗口应用过重。

### 方案 C：独立的计划/任务系统

将番茄钟抽象成可编排计划，未来可支持日历和任务队列，但数据模型、界面和迁移范围明显扩大，不符合本次目标。

## 4. 状态与数据模型

### 4.1 类型

新增或扩展以下类型：

```typescript
type TimerMode = 'focus' | 'pomodoro';
type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroConfig {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
}
```

时长继续使用毫秒，配置界面以分钟展示。默认配置为：

```typescript
{
  focusDuration: 25 * 60 * 1000,
  shortBreakDuration: 5 * 60 * 1000,
  longBreakDuration: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
}
```

建议输入范围：专注 1–180 分钟，休息 1–60 分钟，长休息间隔 1–12 轮。所有值在设置入口和 store action 中双重校验。

### 4.2 timerStore 状态

普通计时字段保持不变，新增：

```typescript
mode: TimerMode;
pomodoroPhase: PomodoroPhase | null;
pomodoroRound: number;
pomodoroWaitingForConfirmation: boolean;
pomodoroPhaseCompletedAt: number | null;
```

- `mode` 表示当前待开始或正在运行的模式。
- `pomodoroPhase` 在番茄钟模式中表示当前阶段，普通模式为 `null`。
- `pomodoroRound` 从 1 开始，只统计专注轮次。
- `pomodoroWaitingForConfirmation` 表示当前阶段已结束，必须由用户确认下一阶段。
- `pomodoroPhaseCompletedAt` 用于恢复和防止阶段完成逻辑重复执行。

所有经过时间仍由 `startedAt`、`pausedAt`、`cumulativePausedDuration` 和当前时间计算，禁止新增递减秒数或依赖 interval 累积时间。

### 4.3 FocusSession 兼容

为新产生的记录增加可选 `mode` 字段，番茄钟专注阶段写入 `pomodoro`，普通计时写入 `focus`。旧 JSON 记录缺少该字段时默认按 `focus` 读取，不改变旧数据的统计结果。

休息阶段不创建 `FocusSession`。专注阶段仍遵守现有最短有效时长 60 秒规则。

## 5. 状态转换与阶段流程

### 5.1 普通模式

继续使用现有流程：

```text
IDLE → RUNNING → PAUSED → RUNNING
                 │
                 ├─ stop → CANCELLED → IDLE
                 └─ target reached → COMPLETED
```

### 5.2 番茄钟模式

```text
IDLE
  └─ 开始 → RUNNING / focus / 第 1 轮
      ├─ 暂停 → PAUSED → 继续 → RUNNING
      ├─ 专注结束 → COMPLETED + 等待确认
      │    └─ 确认休息 → RUNNING / shortBreak 或 longBreak
      ├─ 休息结束 → COMPLETED + 等待确认
      │    └─ 确认下一轮 → RUNNING / focus / 下一轮
      └─ 停止 → CANCELLED → IDLE
```

阶段选择规则：

1. 第 `N` 个专注阶段结束时，如果 `N` 是 `cyclesBeforeLongBreak` 的倍数，下一阶段为长休息，否则为短休息。
2. 短休息结束后确认进入下一轮专注。
3. 长休息结束后确认进入下一组的第 1 轮专注。
4. 阶段结束时只停止当前阶段并等待确认，不自动跳转。
5. 在休息阶段点击停止不保存休息记录；在专注阶段点击停止则按现有规则保存有效专注记录。

### 5.3 应用恢复

启动时读取持久化的活动阶段：

- 若阶段尚未到期，按时间戳恢复剩余时间。
- 若阶段已经到期，标记为“等待确认”，不自动开始下一阶段。
- 使用 `pomodoroPhaseCompletedAt` 或等价幂等标记，避免重启或重复渲染造成重复保存专注记录。
- 由于应用完全退出时无法执行桌面通知，重启后通过页面状态和一次补发通知提示用户。

## 6. 界面设计

### 6.1 主界面

- 在计时区域上方增加轻量模式切换控件：普通计时 / 番茄钟。
- 活跃计时或阶段等待确认时禁用模式切换。
- 番茄钟计时中显示阶段名称和轮次，如“专注 · 第 2/4 轮”。
- 阶段结束显示毛玻璃确认卡片，提供明确的下一步按钮：
  - “开始短休息”
  - “开始长休息”
  - “开始下一轮”
- 保留现有开始、暂停、停止操作，不改变普通模式的交互。

### 6.2 设置面板

增加“番茄钟”配置区：

- 专注时长、短休息、长休息、长休息间隔。
- 经典番茄钟一键恢复默认值。
- 活跃计时期间所有配置控件禁用。
- 输入错误时显示简短的就地提示，不阻塞整个设置面板。

### 6.3 紧凑模式

继续保持 220 × 140 尺寸，显示阶段名称、轮次和倒计时。阶段等待确认时，显示单个主要确认按钮，保证小窗口中仍可完成关键操作。

所有新增控件遵循现有 Frosted Glass Minimalism：4px 间距网格、蓝紫色强调、完整 hover/active/focus/disabled 状态，并尊重 `prefers-reduced-motion`。

## 7. 持久化与通知

- 番茄钟配置存入 `settingsStore`，沿用现有 localStorage 持久化和版本迁移机制。
- 活动阶段字段存入 `timerStore` 的持久化切片，保持窗口关闭后可恢复。
- 记录仍通过现有 `statsStore` → `storageService` → Tauri JSON 链路保存。
- 阶段完成通知复用现有桌面通知服务；通知关闭时，页面内确认卡片仍必须出现。
- 不新增系统权限；除非实现中发现现有通知权限声明不足，否则不扩展 capability。

## 8. 实施拆分

1. 增加类型、默认配置和番茄钟纯函数：阶段目标、下一阶段和配置校验。
2. 扩展 `timerStore`，实现番茄钟开始、阶段完成、确认下一阶段、暂停/恢复、停止和恢复逻辑。
3. 扩展 `FocusSession` 与 Rust JSON 兼容读取，确保旧记录可用。
4. 增加主界面模式切换和阶段状态展示。
5. 增加设置面板配置和默认值恢复。
6. 补充紧凑模式、通知文案和键盘快捷键行为。
7. 运行类型、构建、Rust 和桌面 QA 检查，并手动验证阶段流程。

## 9. 验证标准

- 普通计时模式行为不回归。
- 经典配置按“25 分钟专注 → 5 分钟短休息 → … → 15 分钟长休息”正确循环。
- 每个阶段结束都等待确认，不会自动开始下一阶段。
- 暂停/恢复不产生时间漂移，锁屏、休眠和最小化后按真实时间计算。
- 关闭和重启后不会重复保存专注记录，阶段到期时能恢复到确认状态。
- 休息阶段不进入历史、今日时长或连续学习天数统计。
- 旧版 JSON 数据可以正常读取，缺少 `mode` 时按普通计时处理。
- 设置输入、模式切换和阶段确认在普通模式与紧凑模式下均可操作。
- `npm run typecheck`、`npm run build` 和 `cargo check --manifest-path src-tauri/Cargo.toml` 通过。

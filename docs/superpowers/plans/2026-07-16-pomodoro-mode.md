# 番茄钟模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有普通计时器中增加可配置、阶段结束需确认的番茄钟模式，并保持时间戳计时、持久化恢复和桌面窗口体验。

**Architecture:** 继续以 `timerStore` 作为唯一计时状态机，在其上增加模式、阶段、轮次和确认状态；使用纯函数计算阶段目标和下一阶段。配置归 `settingsStore` 持久化，专注阶段复用现有 `statsStore`/Tauri JSON 记录链路，休息阶段不产生记录。UI 增加主界面模式切换、设置配置区和阶段确认卡片，普通模式逻辑保持原样。

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tauri 2, Rust JSON persistence, Lucide React, Vitest。

---

## 文件结构与职责

| 文件 | 变更职责 |
| --- | --- |
| `src/types/index.ts` | 模式、阶段、周期配置和会话模式类型 |
| `src/utils/pomodoro.ts` | 默认配置、校验、阶段目标和下一阶段纯函数 |
| `src/stores/settingsStore.ts` | 持久化番茄钟配置 |
| `src/stores/timerStore.ts` | 番茄钟状态机、阶段完成、确认和恢复 |
| `src/services/storageService.ts` | 旧记录兼容读取和新会话模式写入 |
| `src-tauri/src/lib.rs` | Rust JSON 记录的兼容 `mode` 字段 |
| `src/components/ModeSwitcher.tsx` | 普通计时/番茄钟切换 |
| `src/components/PomodoroPhaseCard.tsx` | 阶段结束确认卡片 |
| `src/components/SettingsPanel.tsx` | 番茄钟配置表单 |
| `src/components/TimerRing.tsx` | 阶段和轮次展示 |
| `src/components/CompactTimer.tsx` | 紧凑模式的阶段操作 |
| `src/App.tsx` | 完成判断、通知和组件组合 |
| `src/hooks/useKeyboardShortcuts.ts` | 等待确认时的快捷键行为 |
| `src/services/notificationService.ts` | 阶段完成通知 |
| `tests/pomodoro.test.ts` | 阶段序列和配置校验测试 |
| `README.md` | 番茄钟功能和使用说明 |

## Task 1: 建立番茄钟领域类型与纯函数

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Create: `src/utils/pomodoro.ts`
- Create: `tests/pomodoro.test.ts`

- [ ] **Step 1: 增加 Vitest**

Run:

```
npm install --save-dev vitest
```

在 `package.json` 中增加：

```json
"test": "vitest run"
```

- [ ] **Step 2: 增加共享类型**

在 `src/types/index.ts` 增加：

```typescript
export type TimerMode = 'focus' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';
export type SessionMode = 'focus' | 'pomodoro';

export interface PomodoroConfig {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
}
```

给 `FocusSession` 和 `StudyRecord` 增加 `mode: SessionMode`；旧记录在存储层读取时默认设为 `focus`。

- [ ] **Step 3: 编写纯函数测试**

在 `tests/pomodoro.test.ts` 覆盖：经典默认值、3 轮后短休息、4 轮后长休息、短休息进入下一轮、长休息重置到第 1 轮，以及非法配置回退默认值。测试使用如下接口：

```typescript
getPomodoroPhaseDuration(phase, config)
getNextPomodoroPhase(phase, round, cyclesBeforeLongBreak)
normalizePomodoroConfig(value)
```

Run: `npm.cmd run test -- --run tests/pomodoro.test.ts`  
Expected: 初次运行因工具函数尚未实现而失败。

- [ ] **Step 4: 实现 `src/utils/pomodoro.ts`**

实现经典配置：专注 25 分钟、短休息 5 分钟、长休息 15 分钟、每 4 轮长休息；配置范围为专注 1–180 分钟、休息 1–60 分钟、间隔 1–12 轮。阶段选择必须遵循：

```typescript
focus + round % cycles === 0  -> longBreak, same round
focus + otherwise              -> shortBreak, same round
shortBreak                     -> focus, round + 1
longBreak                      -> focus, round 1
```

- [ ] **Step 5: 运行测试并提交领域层**

Run: `npm.cmd run test -- --run tests/pomodoro.test.ts`  
Expected: 所有纯函数测试通过。

```bash
git add package.json package-lock.json src/types/index.ts src/utils/pomodoro.ts tests/pomodoro.test.ts
git commit -m "feat: add pomodoro domain model"
```

## Task 2: 持久化番茄钟配置

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.module.css`

- [ ] **Step 1: 扩展 settingsStore**

增加 `pomodoroConfig`、`setPomodoroConfig(update)` 和 `resetPomodoroConfig()`。迁移 `study-timer-settings` 时调用 `normalizePomodoroConfig`；其他设置字段和现有版本迁移行为保持不变。

- [ ] **Step 2: 增加番茄钟配置区**

在设置面板增加四个数字输入：专注时长、短休息、长休息、长休息间隔。输入以分钟展示，写入 store 时转换为毫秒。增加“恢复经典设置”按钮。

计时 `RUNNING`、`PAUSED` 或阶段等待确认时禁用输入；为输入添加 `min`、`max`、`step`、`aria-label` 和就地错误提示。沿用玻璃面板、4px 间距、focus-visible、disabled 和 reduced-motion 规范。

- [ ] **Step 3: 验证并提交**

Run: `npm.cmd run typecheck`  
Expected: PASS，无未使用变量和隐式 `any`。

```bash
git add src/stores/settingsStore.ts src/components/SettingsPanel.tsx src/components/SettingsPanel.module.css
git commit -m "feat: add pomodoro settings"
```

## Task 3: 扩展 timerStore 阶段状态机

**Files:**
- Modify: `src/stores/timerStore.ts`
- Modify: `src/utils/timer.ts`
- Modify: `src/hooks/useTimer.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: 增加状态字段和 action**

在 timer state 增加：

```typescript
mode: TimerMode;
pomodoroPhase: PomodoroPhase | null;
pomodoroRound: number;
pomodoroWaitingForConfirmation: boolean;
pomodoroPhaseCompletedAt: number | null;
```

增加 `setMode(mode)` 和 `confirmPomodoroPhase()`。活跃计时或等待确认时 `setMode` 无效；切换到普通模式时清理番茄钟字段，切换到番茄钟时只设置为专注第 1 轮，不自动开始。

- [ ] **Step 2: 让 `start` 按模式初始化**

普通模式保留现有行为。番茄钟模式开始时读取 `useSettingsStore.getState().pomodoroConfig`，设置 `pomodoroPhase: 'focus'`、`pomodoroRound: 1`，并将 `targetDuration` 设为专注时长。`startedAt` 使用 `Date.now()`，暂停字段清零。

- [ ] **Step 3: 让 `complete` 完成单个阶段且幂等**

普通模式完成逻辑保持原样。番茄钟模式完成时：

1. 仅处理 `RUNNING` 且有活动阶段的状态。
2. 使用 `calculateElapsed` 和 `getSessionEnd` 计算真实时长。
3. 当前阶段是 `focus` 且达到 60 秒时，向 statsStore 添加一条 `mode: 'pomodoro'` 会话。
4. 设置 `status: 'COMPLETED'`、`completedDuration`、`pomodoroWaitingForConfirmation: true` 和 `pomodoroPhaseCompletedAt`。
5. 不在 `complete` 内自动启动下一阶段。

`pomodoroPhaseCompletedAt` 或等价 guard 必须防止重复渲染、重复快捷键和重启恢复造成重复保存。

- [ ] **Step 4: 实现 `confirmPomodoroPhase`**

只接受番茄钟 `COMPLETED + waiting` 状态。通过 `getNextPomodoroPhase` 计算下一阶段，设置新的 `startedAt: Date.now()`、阶段目标、轮次并恢复 `RUNNING`。短休息后进入下一轮专注，长休息后进入第 1 轮专注。用户确认是唯一阶段切换入口。

- [ ] **Step 5: 处理 stop、reset 和 restore**

专注阶段停止时沿用最短有效时长规则；休息阶段停止时不创建会话。普通模式的 `COMPLETED/CANCELLED` 恢复行为保持不变，番茄钟等待确认状态必须保留。已持久化的 `RUNNING` 阶段继续让 App 根据时间戳判断是否到期。

- [ ] **Step 6: 验证状态机并提交**

保持 `calculateElapsed` 时间戳方案，不增加递减秒数或依赖 interval 累积时间。App 的完成 effect 仍使用 `elapsed >= targetDuration`，由 store 区分普通会话完成和番茄钟阶段完成。

Run:

```bash
npm.cmd run test -- --run tests/pomodoro.test.ts
npm.cmd run typecheck
npm.cmd run build
```

```bash
git add src/stores/timerStore.ts src/utils/timer.ts src/hooks/useTimer.ts src/App.tsx
git commit -m "feat: implement pomodoro phase state machine"
```

## Task 4: 兼容存量记录并增加阶段通知

**Files:**
- Modify: `src/services/storageService.ts`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/services/notificationService.ts`

- [ ] **Step 1: 兼容旧 JSON**

在 `RawStudyRecord` 增加可选 `mode`；normalize 时仅把字符串 `pomodoro` 识别为番茄钟，缺失或未知值都使用 `focus`。 `toStudyRecord` 写入 `mode: session.mode`。

在 Rust `SessionRecord` 增加：

```rust
#[serde(default = "default_session_mode")]
mode: String,

fn default_session_mode() -> String {
    "focus".to_string()
}
```

- [ ] **Step 2: 增加阶段完成通知**

在通知服务增加 `notifyPomodoroPhaseComplete(phase, round)`，复用现有权限请求流程，文案分别提示“专注完成”“短休息结束”“长休息结束”。通知关闭时页面确认卡片仍然显示。

- [ ] **Step 3: 验证并提交**

Run:

```bash
npm.cmd run typecheck
cargo check --manifest-path src-tauri/Cargo.toml
```

```bash
git add src/services/storageService.ts src-tauri/src/lib.rs src/services/notificationService.ts
git commit -m "feat: persist pomodoro session modes"
```

## Task 5: 实现模式切换和阶段确认 UI

**Files:**
- Create: `src/components/ModeSwitcher.tsx`
- Create: `src/components/ModeSwitcher.module.css`
- Create: `src/components/PomodoroPhaseCard.tsx`
- Create: `src/components/PomodoroPhaseCard.module.css`
- Modify: `src/components/TimerRing.tsx`
- Modify: `src/components/Controls.tsx`
- Modify: `src/components/CompactTimer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 `ModeSwitcher`**

用精确 Zustand selector 读取 `mode`、`status`、等待状态和 `setMode`。渲染“普通计时”和“番茄钟”两个 `aria-pressed` 按钮；活跃计时或等待确认时禁用。使用 `memo`、蓝紫色强调、玻璃背景、hover/active/focus/disabled 状态。

- [ ] **Step 2: 创建 `PomodoroPhaseCard`**

组件只接收 props：

```typescript
interface PomodoroPhaseCardProps {
  completedPhase: PomodoroPhase;
  nextPhase: PomodoroPhase;
  nextRound: number;
  onConfirm: () => void;
}
```

显示阶段完成信息、下一阶段和一个主要确认按钮，不提供绕过确认的隐式操作。

- [ ] **Step 3: 接入普通和紧凑布局**

在 `App.tsx` 计时区域附近放置 `ModeSwitcher`；等待确认时以 `PomodoroPhaseCard` 替换普通 Controls。 `TimerRing` 增加可选阶段/轮次文案，`CompactTimer` 保留阶段名称和一个紧凑确认按钮。等待确认时 Controls 不可重复停止。

- [ ] **Step 4: 浏览器预览验证**

Run: `npm.cmd run dev`  
手动验证 idle、running、paused、阶段等待确认、紧凑模式和模式切换的可操作性，检查没有内容溢出。

- [ ] **Step 5: 提交 UI 层**

```bash
git add src/components/ModeSwitcher.tsx src/components/ModeSwitcher.module.css src/components/PomodoroPhaseCard.tsx src/components/PomodoroPhaseCard.module.css src/components/TimerRing.tsx src/components/Controls.tsx src/components/CompactTimer.tsx src/App.tsx
git commit -m "feat: add pomodoro mode controls"
```

## Task 6: 完成快捷键、恢复和文档

**Files:**
- Modify: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `README.md`

- [ ] **Step 1: 让快捷键识别等待确认**

等待确认时 `Ctrl+Alt+Space` 调用 `confirmPomodoroPhase`；`Ctrl+Alt+S` 停止并重置。普通模式快捷键不变。

- [ ] **Step 2: 保证通知只触发一次**

App effect 依赖 `status`、`mode`、`pomodoroPhase` 和 `pomodoroPhaseCompletedAt`，只在阶段首次进入等待状态时调用通知服务。持久化完成时间戳用于重渲染和重启幂等。

- [ ] **Step 3: 更新 README**

删除“当前不包含番茄钟间隔模式”的旧说明，增加经典默认值、配置范围、阶段确认、锁屏/休眠恢复、休息不计入统计和快捷键说明。

- [ ] **Step 4: 完成检查并提交**

Run:

```bash
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
```

```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx src/components/SettingsPanel.tsx README.md
git commit -m "docs: document pomodoro workflow"
```

## Task 7: 桌面 QA 与发布构建

**Files:**
- Verify: `.agents/skills/desktop-app-qa/SKILL.md`
- Verify: `src/stores/timerStore.ts`
- Verify: `src/components/ModeSwitcher.tsx`
- Verify: `src/components/PomodoroPhaseCard.tsx`
- Verify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: 执行功能矩阵**

手动验证：经典 25/5/15 x4 序列；每阶段结束等待确认；专注和休息暂停/恢复；最小化、锁屏、休眠后的真实时间；专注停止保存一次；休息停止不保存；关闭和重启不重复记录；模式和设置在 active/waiting 时禁用。

- [ ] **Step 2: 执行 UI 与缩放检查**

检查普通和紧凑模式下的阶段文案、确认按钮、焦点轮廓、玻璃效果、减少动效，以及 100%、125%、150%、200% Windows 缩放下的可见性。

- [ ] **Step 3: 执行生产构建**

Run:

```bash
git diff --check
npm.cmd run tauri -- build --bundles nsis
```

Expected: capability 不需要新增；NSIS 安装包出现在 `src-tauri/target/release/bundle/nsis/`。

- [ ] **Step 4: 最终 diff 审核**

Run:

```bash
git status -sb
git diff HEAD~6 --stat
git log --oneline -8
```

确认只包含番茄钟实现、测试、文档和已批准的窗口关闭修补，没有无关生成文件。




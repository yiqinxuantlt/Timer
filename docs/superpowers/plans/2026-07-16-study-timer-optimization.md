# Study Timer Structure and Core Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收敛学习计时器的状态、统计和持久化边界，删除冗余代码，并让普通/紧凑模式拥有稳定简洁的现代界面。

**Architecture:** 保留 React + Zustand + Tauri 2。纯计时和统计算法放入 `src/utils`，Tauri/localStorage 放入 `src/services`，App 只负责组合 hooks 和页面组件。有效会话统一按完成状态与 60 秒最短时长过滤，旧 JSON 记录按 completed 兼容读取。

**Tech Stack:** React 18, TypeScript 5.5, Zustand, Vite, Tauri 2, CSS Modules, Lucide React.

---

### Task 1: 定义计时与统计纯函数

**Files:**
- Create: `src/utils/timer.ts`
- Create: `src/utils/stats.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 定义会话状态和计时快照类型**

在 `src/types/index.ts` 增加 `SessionStatus`，为 `FocusSession` 增加 `status`，并为设置中的目标时长使用明确的默认值语义。

- [ ] **Step 2: 实现时间戳计算函数**

`src/utils/timer.ts` 提供 `calculateElapsed`、`calculateProgress`、`getSessionEnd` 和 `isTimerActive`。函数只接收状态快照和 `now`，不维护递减秒数。

- [ ] **Step 3: 实现统计函数**

`src/utils/stats.ts` 提供 `MIN_VALID_DURATION_MS`、`isValidSession`、`calculateTodayTotal`、`calculateTotalDuration` 和 `calculateStreak`。所有函数只统计 completed 且达到门槛的会话，并按开始日期归属。

- [ ] **Step 4: 运行类型检查**

Run: `node_modules/.bin/tsc.cmd --noEmit`  
Expected: 当前代码仍可编译，新增类型没有未使用错误。

### Task 2: 重构存储服务和 Rust 兼容格式

**Files:**
- Create: `src/services/storageService.ts`
- Modify: `src/stores/statsStore.ts`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 封装会话读写**

在 `storageService` 中集中实现 Tauri `get_study_data` / `save_study_data`、localStorage 降级、旧记录 status 默认值和 Promise 写入队列。

- [ ] **Step 2: 让 statsStore 只管理会话和派生统计**

`addSession`、`deleteSession`、`clearAllSessions` 改为异步，新增会话先验证有效性，再更新状态并等待 `persistSessions`。统计统一调用 `src/utils/stats.ts`。

- [ ] **Step 3: 扩展 Rust 记录兼容 status**

在 `SessionRecord` 增加带 serde 默认值的 `status` 字段，使旧的 `study_data.json` 可以读取，新写入记录包含状态。

- [ ] **Step 4: 验证存储路径和 manifest**

Run: `cargo metadata --no-deps --format-version 1`  
Expected: manifest 可解析，Tauri 命令仍为 `get_study_data` 与 `save_study_data`。

### Task 3: 重构计时状态机与显示 tick

**Files:**
- Create: `src/hooks/useTimer.ts`
- Modify: `src/stores/timerStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TimerRing.tsx`
- Modify: `src/components/CompactTimer.tsx`

- [ ] **Step 1: 让 timerStore 使用纯计时函数**

所有 start/pause/resume/stop/complete 操作使用时间戳快照。停止和完成动作在状态离开 active 后异步等待 statsStore 保存，短会话不写入历史。

- [ ] **Step 2: 添加 useTimer hook**

使用递归 `setTimeout` 或可取消的显示 tick 驱动重新渲染，elapsed/progress 始终由 `Date.now()` 和 store 时间戳计算，禁止在 hook 中递减计数。

- [ ] **Step 3: 移除 App 中的 setInterval 和重复计时计算**

App 只根据 hook 的 elapsed 判断自动完成；TimerRing 与 CompactTimer 接收统一的 elapsed/progress，避免进度环停在 0%。

- [ ] **Step 4: 验证状态转换**

逐项检查 IDLE → RUNNING → PAUSED → RUNNING → COMPLETED/IDLE，以及快速重复停止不会产生多条记录。

### Task 4: 拆分平台副作用

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Create: `src/hooks/useWindowManagement.ts`
- Create: `src/services/notificationService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: 抽取快捷键注册和清理**

保留 `Ctrl+Alt+Space` 和 `Ctrl+Alt+S`，注册只发生在 Tauri 且设置开启时，卸载时逐一 unregister。

- [ ] **Step 2: 抽取窗口控制和关闭保存**

集中处理 Tauri 检测、置顶、普通/紧凑尺寸和 close-requested。关闭时 `await timerStore.stop(true)` 后再 destroy，异步初始化被卸载时必须清理监听器。

- [ ] **Step 3: 抽取通知服务**

完成状态触发通知，处理权限请求和失败降级，不让通知异常阻塞计时状态。

### Task 5: 清理组件和设置状态

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Delete: `src/components/SubjectInput.tsx`
- Delete: `src/components/SubjectInput.module.css`
- Delete: `src/components/DurationSelector.tsx`
- Delete: `src/components/DurationSelector.module.css`
- Delete: `src/components/StatsCard.tsx`
- Delete: `src/components/StatsCard.module.css`
- Delete: `src/components/HistoryPanel.tsx`
- Delete: `src/components/HistoryPanel.module.css`

- [ ] **Step 1: 统一默认目标时长状态**

`settingsStore` 只保存默认时长，`timerStore` 保存当前会话目标时长快照。设置面板在 active 状态禁用目标时长按钮，空闲时由 App 同步默认值。

- [ ] **Step 2: 删除没有有效入口的旧组件**

删除四组未使用组件及样式，并用 `rg` 确认没有残留 import。

- [ ] **Step 3: 运行类型检查**

Run: `node_modules/.bin/tsc.cmd --noEmit`  
Expected: 通过，且 `rg` 不再找到已删除组件的源代码引用。

### Task 6: 统一现代简洁视觉

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/components/TimerRing.module.css`
- Modify: `src/components/Controls.module.css`
- Modify: `src/components/TodayStats.module.css`
- Modify: `src/components/HistoryModal.tsx`
- Modify: `src/components/HistoryModal.module.css`
- Modify: `src/components/SettingsPanel.module.css`
- Modify: `src/components/CompactTimer.module.css`

- [ ] **Step 1: 收敛 design tokens**

统一玻璃背景、蓝紫渐变、阴影、4px/8px 间距、focus-visible 和 reduced-motion，不在组件中新增硬编码颜色。

- [ ] **Step 2: 修复进度环和控制按钮状态**

进度环使用 stroke-dashoffset transition；按钮提供 default/hover/active/focus/disabled 状态，避免持续闪烁动画。

- [ ] **Step 3: 优化历史统计层级**

历史模态框显示今日、累计和连续天数，按开始日期分组，操作按钮使用明确的危险态和确认态。

- [ ] **Step 4: 检查普通/紧凑模式布局**

保证 320×420 与 220×140 两种尺寸下内容不溢出，标题栏仍可拖动，紧凑模式保持核心操作可达。

### Task 7: 构建和 QA

**Files:**
- Modify: `package.json` only if a script needs correction

- [ ] **Step 1: TypeScript 检查**

Run: `node_modules/.bin/tsc.cmd --noEmit`  
Expected: PASS。

- [ ] **Step 2: 前端生产构建**

Run: `npm.cmd run build`  
Expected: Vite 构建成功。

- [ ] **Step 3: Rust 检查**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`  
Expected: PASS；若仅因本机缺少 Rust 工具链失败，记录为环境阻塞。

- [ ] **Step 4: 手动回归**

验证开始、暂停、继续、停止、自动完成、短会话过滤、历史加载、删除、清空、导出、关闭保存、快捷键、通知、置顶、紧凑模式和 reduced-motion。

- [ ] **Step 5: 最终审查**

运行 `git diff --check`、`rg` 检查残留旧组件/递减计时/未使用 import，并按 `desktop-app-qa` 清单报告通过项与环境限制。

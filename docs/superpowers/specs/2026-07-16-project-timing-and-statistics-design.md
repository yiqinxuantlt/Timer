# 项目计时与统计增强设计

**日期：** 2026-07-16  
**状态：** 已按“继续”确认实施  
**目标：** 将单一的自由文本科目升级为可管理的项目计时，并在不破坏既有记录的前提下提供按项目拆分的专注统计。

## 1. 目标与边界

本次功能应让用户能够创建、选择、重命名和归档多个学习项目（例如“数学复习”“英语阅读”“毕业设计”），每次有效专注会话都绑定开始时选定的项目。历史页应同时提供整体统计和项目维度的统计，使用户能看清每个项目的今日投入、累计投入、专注次数与占比。

本次不新增账号、云同步、日历、番茄钟规则或独立的大屏数据中心；紧凑模式继续仅保留计时核心，不增加项目管理入口。计时仍由时间戳推导，项目切换不能改变正在运行或暂停中的会话。

验收标准：

- 用户在空闲状态可以创建项目、选择项目，并在下一次计时中使用它。
- 运行或暂停期间项目选择器禁用；该会话结束后，历史记录保留当时项目的快照。
- 项目统计只计入完成且不少于 60 秒的会话，仍按会话开始日期归属今日和连续天数。
- 历史 JSON、浏览器 localStorage 和 Tauri JSON 都能读取没有项目字段的旧数据；旧记录不会丢失，也不会被错误归类。
- 统计页可以查看七日投入、所有项目的今日/累计/次数/占比，且历史记录与导出含项目名称。

## 2. 数据模型

```ts
export type ProjectColor =
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface StudyProject {
  id: string;
  name: string;
  color: ProjectColor;
  createdAt: number;
  archivedAt: number | null;
}

export interface FocusSession {
  id: string;
  // 保留旧字段，作为导出兼容字段和没有 projectId 的旧记录回退名称。
  subject: string;
  projectId: string | null;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
  status: SessionStatus;
  mode: SessionMode;
}

export interface StudyData {
  records: StudyRecord[];
  projects: StudyProject[];
  total_seconds: number;
}
```

`projectId` 是可空字段：新会话始终写入项目 ID；旧会话读取为 `null`。`subject` 是会话开始时的项目名称快照，项目随后重命名时，旧记录和导出依然可读、可解释。

系统保留一个不可归档的默认项目 `project-default`（名称为“学习”）。新安装、旧数据迁移或已归档项目被选中时都回退到它。项目名去除首尾空白、限制为 20 个字符，比较时忽略大小写，避免重复项目。

## 3. 兼容与迁移规则

Tauri 的 `StudyData.projects` 使用 `#[serde(default)]`；`SessionRecord.projectId` 使用 `Option<String>` 与 `#[serde(default)]`。因此旧的 `study_data.json` 能被 Rust 直接读取，旧记录中的项目 ID 为 `null`。

前端读取时必须验证项目数组、项目 ID、名称、颜色和归档时间；无效项目条目被忽略，但有效记录仍加载。缺少项目数组时，前端以默认项目作为运行时回退并在下一次完整快照写入时一并保存。读取过程不会修改或删除旧会话。

没有 `projectId` 的旧会话在统计视图中按规范化的 `subject` 聚合为“历史项目”卡片。它们不伪造关联到新项目，避免把不同的旧名称或后来重名项目混在一起。用户的新会话始终使用明确的项目 ID。

计时器持久化状态增加 `projectId`。旧的 `study-timer-state` 没有此字段时，恢复为默认项目；`subject` 继续作为显示和通知的兼容快照。

## 4. 状态与数据流

```text
ProjectSelector / ProjectManager
  └─ statsStore（项目列表的创建、重命名、归档、持久化）
       └─ storageService（完整 StudyData 快照，Tauri JSON / localStorage）

TitleBar 选择项目（仅 IDLE / COMPLETED）
  └─ timerStore.setProject(project)
       ├─ projectId + subject 快照持久化到 timer state
       └─ start / stop / complete 创建带 projectId 的 FocusSession
            └─ statsStore.addSession → 完整 StudyData 持久化

HistoryModal / TodayStats
  └─ utils/stats 的纯函数生成今日、累计、七日和项目汇总
```

`statsStore` 仍是长期专注数据的唯一 Zustand 所有者；它同时维护 `sessions` 与 `projects`，而 `timerStore` 只拥有当前计时会话选择。项目列表改变、会话新增、删除或清空时，均将同一份 `StudyData` 快照排队写入，避免项目与会话跨键不同步。

所有项目统计都从 `isValidSession` 过滤后的会话导出：状态必须为 `completed`、时长至少 60 秒、时间范围按 `startedAt` 归属。连续天数算法保持现有规则，不按项目拆分。

## 5. 交互与视觉方案

### 5.1 标题栏项目选择

标题栏左侧使用项目色点、项目名称与下拉箭头替代自由输入科目。空闲状态下点击后显示项目列表，当前项目有选中态；底部提供“新建项目”和“管理项目”。运行/暂停时该入口完全禁用，防止当前会话被重新归类。

创建项目时输入名称、选择六色调色板之一，并立即将其选中；名称重复、空白或超过上限时不允许保存。管理面板支持重命名、换色、归档和恢复；默认项目不可归档，已归档项目不出现在选择列表但统计和历史仍保留。

### 5.2 主窗口今日统计

`TodayStats` 保持“今日专注”主数值，并增加一个轻量项目行：显示当前项目色点、项目名与该项目今日时长。这样不打开历史页也能确认计时内容与当天投入。紧凑模式不渲染该区块。

### 5.3 统计与历史面板

历史按钮改为“统计与记录”，打开的面板使用两个分段页：

- **统计：** 顶部维持今日、累计、连续天数；随后显示最近七天的日投入条形带，以及按累计投入排序的项目卡片。每张卡片有项目色点、今日时长、累计时长、有效次数和占总投入的比例条。
- **记录：** 保留现有按开始日期分组的会话列表、删除、清空和 JSON 导出。每条记录显示项目色点与会话开始时的项目名称；导出增加 `projectId` 与 `projectName`。

界面沿用已有深色磨砂玻璃、8px 间距、项目色低饱和强调和完整 hover/active/focus-visible/disabled 状态。数字使用等宽数字；动画只使用短暂的 opacity/transform 过渡并遵从 `prefers-reduced-motion`。面板在 320×420 的窗口内垂直滚动，不能使主窗口溢出。

## 6. 纯函数与统计口径

新增项目统计结果不进入持久化状态：

```ts
interface ProjectSummary {
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

interface DailyFocusTotal {
  date: string;
  duration: number;
}
```

`calculateProjectSummaries(sessions, projects, now)` 按项目 ID 聚合新记录，按 `subject` 聚合旧记录；只有有效会话参与。`calculateRecentDailyTotals(sessions, now, 7)` 返回包含零值日期的连续七日序列。`share` 在所有有效会话总时长为零时为零，其余为该项目累计时长除以总时长。

## 7. 验证范围

- 单元测试：项目校验、默认项目、旧数据归一化、完整快照存取、项目汇总、七日补零、归档后的统计保留、项目切换创建会话。
- 组件测试：项目选择禁用状态、创建流程、统计/记录页切换、项目卡片和旧记录回退标签、导出字段。
- 编译检查：`npm.cmd run typecheck`、`npm.cmd run build`、`cargo check --manifest-path src-tauri/Cargo.toml`。
- 手动检查：创建三个项目、分别完成有效会话、暂停/恢复、运行中不可切换、归档、重启恢复、浏览器回退与紧凑模式，并按桌面 QA 清单检查键盘焦点、DPI、滚动和窗口交互。

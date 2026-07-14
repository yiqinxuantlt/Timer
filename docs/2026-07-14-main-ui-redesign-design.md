# 主界面精简 + 历史记录分离 + 右键菜单 设计文档

**日期：** 2026-07-14
**状态：** 已批准
**版本：** v1.0

---

## 1. 概述

将学习计时器主界面精简为只保留计时核心功能，历史记录移入独立模态框，通过右键菜单提供辅助功能入口，同时完全移除有缺陷的紧凑模式。

### 核心改动

1. 主界面精简为：TitleBar + TimerRing + Controls + TodayStats
2. 历史记录移入全屏模态框
3. 右键菜单提供快速功能入口
4. 紧凑模式整体移除
5. TitleBar 增加快速科目输入

---

## 2. 主界面布局

### 窗口尺寸
- 保持不变：320×420

### TitleBar
```
[数学 ▾]  [置顶] [设置] [历史] [—] [×]
```
- 左侧：可编辑科目标签（点击切换输入，下拉显示最近科目）
- 右侧：置顶、设置、历史、最小化、关闭
- 设置按钮 → 打开 SettingsPanel
- 历史按钮 → 打开 HistoryModal

### 主内容区
```
┌─────────────────────────────────────┐
│  [数学 ▾] [置顶] [设置] [历史] [—] [×]│
├─────────────────────────────────────┤
│                                     │
│           ┌───────────┐             │
│           │           │             │
│           │   圆环    │             │
│           │  00:24:32 │             │ TimerRing
│           │  专注中   │             │ 时间/状态在圆环内
│           │           │             │
│           └───────────┘             │
│                                     │
│         [▶] [⏸] [⏹]               │ Controls
│                                     │
│         今日专注 2h 30m             │ TodayStats
│                                     │
└─────────────────────────────────────┘
```

### 移除组件
| 组件 | 原因 | 替代方案 |
|------|------|---------|
| `CompactTimer` | 有 bug，功能不完善 | 完全移除 |
| `CompactTimer.module.css` | 同上 | 完全移除 |
| `SubjectInput` | 功能并入 TitleBar | TitleBar 科目标签 |
| `DurationSelector` | 功能并入设置 | SettingsPanel 时长选择 |
| `StatsCard` | 数据并入历史模态框 | HistoryModal 顶部统计 |
| `HistoryPanel` | 改为模态框 | HistoryModal |

---

## 3. 新增组件

### 3.1 TodayStats（主界面）

**功能：** 在 Controls 下方显示今日专注总时长

**UI 规格：**
- 文字：`今日专注 Xh Xm` 或 `今日专注 Xm`
- 字号：12px (`--text-xs`)
- 颜色：`--text-muted` (55% 透明度)
- 居中显示

**数据来源：** `useStatsStore.todayTotal`

### 3.2 ContextMenu（右键菜单）

**触发：** 窗口任意区域 `onContextMenu`

**菜单项：**
| 菜单项 | 图标 | 操作 |
|--------|------|------|
| 历史记录 | 📜 | 打开 HistoryModal |
| 设置 | ⚙️ | 打开 SettingsPanel |
| 置顶窗口 | 📌 | 切换 alwaysOnTop（显示 ✓/空） |
| — | — | 分隔线 |
| 关于 | ℹ️ | 显示版本信息 |

**UI 规格：**
- 宽度：160px
- 背景：毛玻璃（与主窗口一致）
- 圆角：12px
- 阴影：`0 8px 40px rgba(0,0,0,0.5)`
- 菜单项高度：36px
- 字体：13px
- 位置：鼠标点击位置附近，自动调整不超出窗口边界

**交互：**
- 点击菜单项 → 执行操作 + 关闭菜单
- 点击外部 → 关闭菜单
- ESC → 关闭菜单

### 3.3 HistoryModal（历史记录模态框）

**触发：** 右键菜单"历史记录" / TitleBar 历史按钮

**UI 规格：**
- 全屏覆盖（320×420）
- 背景毛玻璃效果（与主窗口一致）
- 动画：淡入 + 轻微上移
- 标题："📜 历史记录" + 关闭按钮

**内容结构：**
```
顶部统计区域
┌────────────────────────────────┐
│ 今日专注  2h 30m  │ 连续 7 天  │
└────────────────────────────────┘

按日期分组记录
┌────────────────────────────────┐
│ 2026-07-14  总时长: 4h 15m   │
├────────────────────────────────┤
│ 14:32  数学    1h 30m    [🗑️] │
│ 11:00  英语    45m       [🗑️] │
│ 09:15  语文    1h 15m    [🗑️] │
├────────────────────────────────┤
│ 2026-07-13  总时长: 2h 30m   │
├────────────────────────────────┤
│ 20:00  物理    1h 30m    [🗑️] │
│ 15:30  化学    1h 00m    [🗑️] │
└────────────────────────────────┘

操作按钮
[导出 JSON]  [清空所有]
```

**功能：**
- 顶部：今日专注时长 + 连续天数
- 按日期分组，每组显示日期和总时长
- 每条记录：时间、科目、时长、删除按钮
- 底部：导出 JSON、清空所有

### 3.4 TitleBar 科目标签

**交互：**
- 默认显示"学习"或上次使用的科目
- 点击科目 → 切换为 input 编辑
- Enter 或失焦 → 确认修改
- 点击下拉箭头（▾）→ 显示最近使用科目列表
- 计时运行中禁用编辑

**最近科目列表：**
- 存储在 `settingsStore` 中
- 最多保存 5 个
- 点击快速切换

---

## 4. 移除内容

### 完全删除
- `src/components/CompactTimer.tsx`
- `src/components/CompactTimer.module.css`

### 从主界面移除（组件保留，通过 HistoryModal 调用）
- `src/components/StatsCard.tsx`（统计逻辑移入 HistoryModal）
- `src/components/StatsCard.module.css`
- `src/components/HistoryPanel.tsx`（改为 HistoryModal）
- `src/components/HistoryPanel.module.css`

### 调整
- `src/components/SubjectInput.tsx`（功能并入 TitleBar）
- `src/components/DurationSelector.tsx`（仅通过 SettingsPanel 访问）

---

## 5. 数据流

```
TitleBar 科目编辑
    ↓
timerStore.setSubject()

ContextMenu
    ↓
    历史记录 → HistoryModal.isOpen = true
    设置 → SettingsPanel.isOpen = true
    置顶 → settingsStore.toggleAlwaysOnTop()

HistoryModal
    ↓
statsStore.todayTotal    → 顶部今日统计
statsStore.currentStreak → 顶部连续天数
statsStore.sessions      → 历史列表
statsStore.deleteSession → 删除
statsStore.clearAllSessions → 清空

TodayStats
    ↓
statsStore.todayTotal    → 底部显示
```

---

## 6. 实现顺序

1. 移除紧凑模式（删除文件 + 清理 App.tsx）
2. 改造 TitleBar（科目标签 + 历史按钮）
3. 新增 TodayStats 组件
4. 新增 ContextMenu 组件
5. 新增 HistoryModal 组件（移植 HistoryPanel 逻辑）
6. 清理 App.tsx（移除被替换的组件）
7. 清理设置面板（确认时长选择正常工作）
8. 测试验证

---

## 7. 注意事项

- 紧凑模式移除后，settingsStore 中的 `compactMode` 字段保留但不使用（未来可能重新实现）
- 科目标签的最近使用列表需要初始化空数组
- 右键菜单在浏览器开发模式中也应正常工作
- 历史记录模态框关闭时保存状态（防止意外丢失数据）
- 所有 Tauri API 调用保持惰性 import 模式
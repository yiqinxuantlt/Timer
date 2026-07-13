---
name: study-timer-builder
description: >
  Project master skill for the desktop study timer app (桌面计时小应用).
  Use whenever the user mentions the study timer, learning timer, 桌面计时, 学习计时,
  or asks to continue development, add features, fix bugs, or check project status
  for this app. This skill is the single source of truth for project specs, design
  conventions, and development workflow — always load it before making any changes.
---

# Study Timer Builder — 项目总控 Skill

本 Skill 是桌面学习计时器项目的规范与流程总入口。它不包含大量代码细节，而是定义"做什么、怎么做、按什么顺序做、做到什么标准"。

每次开发前，先读取本 Skill，再按需读取项目源码。

---

## 1. 产品目标与功能边界

### 产品定位
一款极简桌面学习计时器，始终置顶，随时记录学习时长。核心体验是"打开即用，不打扰"。

### 核心功能（已实现）
- 计时器：开始 / 暂停 / 停止，显示 HH:MM:SS
- SVG 进度环：1 小时为满环，渐变填充
- 科目输入：自由文本，默认"学习"
- 统计卡片：今日时长 / 累计时长
- 历史记录：可折叠面板，按日期倒序
- 数据持久化：Tauri 文件存储 + localStorage 降级

### 功能边界（不做）
- 不做番茄钟 / 间隔模式
- 不做云端同步
- 不做多窗口
- 不做复杂统计图表
- 不做用户账户系统

### 待开发功能（按优先级）
1. 紧凑模式（缩小窗口，只显示计时环和时间）
2. 键盘快捷键（Space 开始/暂停，Esc 停止）
3. 桌面通知（达到目标时长时提醒）
4. 历史记录删除
5. 科目记忆 / 自动补全
6. 应用图标（icons/ 目录当前为空）
7. 数据导出（JSON / CSV）
8. 自定义目标时长

---

## 2. 技术栈

| 层 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 桌面壳 | Tauri 2 | ^2.0 | Rust 后端 + WebView 前端 |
| 前端框架 | React | ^18.3 | 组件化 UI 开发 |
| 语言 | TypeScript | ^5.5 | 类型安全 |
| 构建工具 | Vite | ^5.4 | 快速开发/构建 |
| 状态管理 | Zustand | 最新 | 集中式状态管理 |
| 样式方案 | CSS Modules 或 Tailwind CSS | — | 两者择一，项目初期决定 |
| 图标 | Lucide React | 最新 | 统一 SVG 图标库 |
| 本地存储 | Tauri 2 Store | ^2.0 | 设置和少量数据 |
| 长期数据 | SQLite (tauri-plugin-sql) | ^2.0 | 正式数据存储 |
| 单元测试 | Vitest + React Testing Library | 最新 | 组件和逻辑测试 |
| E2E 测试 | WebdriverIO | 最新 | 端到端测试 |
| 字体 | Outfit (Google Fonts) | — | CDN 加载 |
| 包管理 | npm | — | 依赖管理 |

### 关键约束

**已变更（从 Tauri 1 升级）：**
- ✅ 前端使用 Vite 构建，不再是裸文件
- ✅ React 组件拆分，不再是单文件整体
- ✅ TypeScript 类型安全，禁止 `any`（除非充分理由注释说明）
- ✅ Zustand 集中管理计时状态和统计状态
- ✅ Lucide React 统一图标库

**保持不变：**
- ❌ 不引入 Tailwind 之外的 CSS 框架（如 styled-components、Emotion）
- ❌ 不使用 React Router（单窗口应用，无需路由）
- ❌ 不引入动画库（优先 CSS Transition，复杂模式切换再考虑 Motion 类库）
- ❌ Google Fonts 优先 CDN 加载，不打包进构建

---

## 3. 项目目录结构

```
桌面计时小应用/
├── src/                          # 前端源码
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 根组件，组合布局
│   ├── index.html                # HTML 入口
│   │
│   ├── components/               # React 组件
│   │   ├── TitleBar.tsx          # 标题栏 + 窗口控制
│   │   ├── TimerRing.tsx         # SVG 进度环
│   │   ├── TimerDisplay.tsx      # 时间数值 + 状态标签
│   │   ├── SubjectInput.tsx      # 科目输入
│   │   ├── Controls.tsx          # 开始/暂停/停止按钮
│   │   ├── StatsCard.tsx         # 今日/累计统计
│   │   ├── HistoryPanel.tsx      # 历史记录面板
│   │   └── CompactTimer.tsx      # 紧凑模式简单视图
│   │
│   ├── stores/                   # Zustand 状态
│   │   ├── timerStore.ts         # 计时器状态机
│   │   ├── statsStore.ts         # 统计数据
│   │   └── settingsStore.ts      # 应用设置
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useTimer.ts           # 计时器 Hook
│   │   ├── useKeyboardShortcuts.ts # 键盘快捷键
│   │   └── useSystemEvents.ts    # 休眠/锁屏处理
│   │
│   ├── services/                 # 业务逻辑
│   │   ├── timerService.ts       # 计时核心算法
│   │   ├── storageService.ts     # 数据持久化
│   │   ├── notificationService.ts # 系统通知
│   │   └── exportService.ts      # 数据导入导出
│   │
│   ├── types/                    # TypeScript 类型
│   │   ├── timer.ts              # 计时器类型
│   │   ├── focus.ts              # 专注会话类型
│   │   └── settings.ts           # 设置类型
│   │
│   ├── styles/                   # 样式文件
│   │   ├── globals.css           # 全局样式 + CSS 变量
│   │   ├── glass-card.module.css # 毛玻璃卡片
│   │   ├── timer-ring.module.css # 进度环
│   │   └── controls.module.css   # 按钮样式
│   │
│   └── utils/                    # 工具函数
│       ├── format.ts             # 日期/时间格式化
│       ├── math.ts               # 进度计算
│       └── constants.ts          # 常量定义
│
├── src-tauri/                    # Tauri 2 / Rust 后端
│   ├── icons/                    # 应用图标（需补充）
│   ├── src/
│   │   ├── lib.rs                # Tauri 应用入口 + 配置
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── sessions.rs       # 专注会话 CRUD
│   │   │   ├── settings.rs       # 设置读写
│   │   │   └── export.rs         # 数据导出
│   │   └── models/               # Rust 数据模型
│   │       ├── mod.rs
│   │       └── focus.rs
│   ├── capabilities/             # Tauri 2 权限声明
│   │   └── default.json
│   ├── build.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── tests/                        # 测试
│   ├── unit/                     # 单元测试
│   │   ├── timerService.test.ts
│   │   └── format.test.ts
│   ├── components/                # 组件测试
│   │   ├── TimerRing.test.tsx
│   │   └── Controls.test.tsx
│   └── e2e/                      # E2E 测试
│       └── timer.test.ts
│
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wdio.conf.ts                  # WebdriverIO 配置
```

**修改规则：**
- 新增组件 → 在 `src/components/` 创建新文件
- 新增状态 → 在 `src/stores/` 创建新 store
- 新增业务逻辑 → 在 `src/services/` 创建新 service
- 新增类型 → 在 `src/types/` 定义
- 新增 Tauri 命令 → 在 `src-tauri/src/commands/` 添加
- 窗口行为变更 → 更新 `tauri.conf.json`
- 权限变更 → 更新 `capabilities/default.json`

---

## 4. UI 设计规范

### 设计风格：Frosted Glass Minimalism
- 半透明毛玻璃卡片
- 大圆角与柔和阴影
- 蓝紫色主色调（`#6366f1` → `#8b5cf6`）
- 深蓝黑文字
- 暗色/浅色主题自动适配

（详细视觉规范见 `desktop-widget-ui` Skill）

### 动画原则

（完整动画规范见 `desktop-widget-ui` Skill 第 9 章）

**不依赖大型动画库。** 这个应用只需要：

| 动画 | 实现方式 |
|---|---|
| 圆环进度变化 | CSS Transition |
| 按钮按压反馈 | CSS Transition + transform |
| 窗口模式切换 | CSS Transition |
| 完成时轻微脉冲 | CSS animation |
| 设置面板展开/收起 | CSS Transition |

**规则：**
- 优先使用 CSS Transition，`cubic-bezier(0.16, 1, 0.3, 1)`
- 复杂模式切换再引入 Motion 类库（如 framer-motion）
- 所有动画必须尊重 `prefers-reduced-motion`
- 过渡动画只使用 transform/opacity，不触发 layout

---

## 5. 数据结构

（完整数据模型见 `focus-data-and-streaks` Skill）

### 核心类型

```typescript
// 计时器状态（Zustand 集中管理）
interface TimerStore {
  // 状态机
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  
  // 时间基准
  startedAt: number | null;
  targetDuration: number;
  pausedAt: number | null;
  cumulativePausedDuration: number;
  
  // 操作
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: (save: boolean) => void;
  reset: () => void;
  
  // 计算属性
  getElapsed: () => number;
  getProgress: () => number;
}
```

### Tauri 2 命令
| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_sessions` | `{ date?: string }` | `FocusSession[]` | 查询会话列表 |
| `save_session` | `{ session: FocusSession }` | `FocusSession` | 保存会话 |
| `delete_session` | `{ id: string }` | `void` | 删除会话 |
| `get_settings` | — | `AppSettings` | 读取设置 |
| `update_settings` | `{ settings: Partial<AppSettings> }` | `AppSettings` | 更新设置 |
| `export_data` | `{ format: 'json' | 'csv' }` | `string` | 导出数据 |

---

## 6. 开发顺序

按以下顺序开发新功能，每完成一项再进入下一项：

1. 项目初始化（Tauri 2 + React + TypeScript + Vite 脚手架）
2. 应用图标（补充 `src-tauri/icons/`）
3. 组件拆分（将现有功能拆分为 React 组件）
4. Zustand 状态管理（迁移计时状态到 store）
5. 键盘快捷键（Space 开始/暂停，Esc 停止）
6. 紧凑模式（缩小窗口，只显示计时环和时间）
7. 桌面通知（达到目标时长时系统通知）
8. 历史记录删除
9. 科目记忆 / 自动补全
10. 数据导出（JSON / CSV）
11. 自定义目标时长

---

## 7. 代码质量标准

### 通用
- 变量命名：camelCase（TS）、snake_case（Rust）
- 注释：简洁中英混排，解释"为什么"而非"是什么"
- 不留 console.log 调试代码
- 不引入未使用的依赖

### React / TypeScript
- 组件用箭头函数 + `export default`
- Props 用 `interface` 定义
- 禁止 `any`（除非充分理由 + 注释说明）
- 每个 `useEffect` 有明确的依赖数组
- 每个 `addEventListener` 对应 `removeEventListener`
- 定时器在组件卸载时清理

### Zustand
- 计时状态集中在 `timerStore`，不分散在组件本地状态
- 统计状态集中在 `statsStore`
- 不将 store 逻辑复制到组件中

### 样式
- 使用 CSS 变量（design tokens），不硬编码颜色值
- 新增组件必须处理 hover / active / focus / disabled 状态
- 新增动画必须尊重 `prefers-reduced-motion`
- SVG 图标使用 Lucide React，不自行绘制

### Rust
- 命令函数保持简洁，复杂逻辑提取为辅助函数
- 错误处理用 `Result<T, String>` 返回给前端
- 不使用 `unwrap()` 在生产路径中

### Tauri 2
- 窗口尺寸变更同时更新 `tauri.conf.json`
- 新增功能必须在 `capabilities/default.json` 中声明权限
- 权限最小化，不声明 `all: true`

---

## 8. 修改后检查流程

每次代码修改后，按此清单验证：

### 必做
- [ ] `npm run tauri dev` 启动无报错
- [ ] TypeScript 编译无错误
- [ ] 计时器开始/暂停/停止功能正常

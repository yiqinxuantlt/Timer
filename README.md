# 学习计时器 (Study Timer)

<div align="center">

一款简洁优雅的桌面学习计时应用，帮助你记录专注时光，培养持续学习的习惯。

![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=flat-square&logo=tauri)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust)

</div>

---

## ✨ 特性

- 🎯 **目标时长设定** — 支持 15 分钟到 2 小时的目标时长，帮助量化学习任务
- ⏱️ **精准计时** — 基于时间戳计算，自动处理系统休眠、标签页后台等场景
- 🔔 **桌面通知** — 完成时发送系统通知，不打扰专注过程
- 📊 **数据统计** — 自动记录今日专注时长、连续学习天数
- 📜 **历史记录** — 查看所有学习记录，支持导出 JSON
- 🪟 **紧凑模式** — 切换到小窗口，节省屏幕空间
- 📌 **窗口置顶** — 始终保持在其他窗口之上
- ⌨️ **全局快捷键** — `Ctrl+Alt+Space` 播放/暂停，`Ctrl+Alt+S` 停止
- 🎨 **毛玻璃效果** — 现代化的 Glassmorphism 设计风格

---

## 📸 截图

### 普通模式
![Normal Mode](./screenshots/normal-mode.png)

### 紧凑模式
![Compact Mode](./screenshots/compact-mode.png)

### 设置面板
![Settings Panel](./screenshots/settings-panel.png)

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.x
- **Rust** >= 1.70 (通过 [rustup](https://rustup.rs/) 安装)
- **pnpm** / **npm** / **yarn**

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 前端开发（浏览器预览，无需 Rust）
npm run dev

# 完整桌面应用开发（需要 Rust）
npm run tauri:dev
```

### 构建发布

```bash
# 构建生产版本
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust |
| UI 风格 | Glassmorphism (毛玻璃) |

### 目录结构

```
study-timer/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── TimerRing.tsx   # 计时圆环
│   │   ├── Controls.tsx    # 控制按钮
│   │   ├── StatsCard.tsx   # 统计卡片
│   │   ├── HistoryPanel.tsx# 历史记录
│   │   ├── SettingsPanel.tsx# 设置面板
│   │   └── ...
│   ├── stores/             # Zustand 状态管理
│   │   ├── timerStore.ts   # 计时状态机
│   │   ├── statsStore.ts   # 数据持久化
│   │   └── settingsStore.ts# 用户设置
│   ├── styles/             # 全局样式
│   └── types/              # TypeScript 类型定义
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/lib.rs          # Tauri 命令
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
├── package.json
└── README.md
```

### 数据流

```
React 前端
    ↓ Zustand Store
Tauri IPC
    ↓ invoke()
Rust 后端 (lib.rs)
    ↓ JSON 序列化
本地文件 (study_data.json)
```

---

## ⚙️ 配置说明

### 窗口配置 (`tauri.conf.json`)

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 普通窗口 | 320 × 420 px | 默认窗口尺寸 |
| 紧凑窗口 | 220 × 140 px | 小窗口模式 |
| 无边框 | `decorations: false` | 自定义标题栏 |
| 透明背景 | `transparent: true` | 支持毛玻璃效果 |

### CSP 安全策略

```json
"csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
```

---

## 📝 开发脚本

```bash
# 开发
npm run dev           # 前端开发服务器
npm run tauri:dev     # Tauri 开发模式

# 构建
npm run build         # 前端构建
npm run tauri:build   # 完整应用构建

# 代码质量
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化
npm run format:check  # 格式检查
npm run typecheck     # TypeScript 类型检查
```

---

## 🔧 核心实现

### 计时逻辑（关键）

**禁止使用 `setInterval` 递减秒数！** 计时器基于时间戳计算，正确处理系统休眠、标签页后台等场景：

```typescript
// 正确做法：基于时间戳计算
const elapsed = Date.now() - startedAt - cumulativePausedDuration;

// 错误做法：不要递减计数器
elapsedSeconds--; // ❌ 错误！
```

### 状态机

```
IDLE → RUNNING → PAUSED → RUNNING (继续)
                  ↓
              COMPLETED
                  ↓
                 IDLE
```

### 数据持久化

- **Tauri 环境**：数据保存至 `%APPDATA%/study-timer/study_data.json`
- **浏览器环境**：仅内存存储，用于开发调试
- **自动迁移**：首次运行时自动从 localStorage 迁移旧数据

---

## 📦 依赖说明

### 前端依赖

| 包名 | 用途 |
|------|------|
| `react` / `react-dom` | UI 框架 |
| `zustand` | 轻量状态管理 |
| `lucide-react` | 图标库 |
| `@tauri-apps/api` | Tauri API |
| `@tauri-apps/plugin-*` | 通知、快捷键插件 |

### Rust 依赖

| 包名 | 用途 |
|------|------|
| `tauri` | 桌面框架核心 |
| `serde` / `serde_json` | JSON 序列化 |
| `chrono` | 时间处理 |
| `uuid` | 唯一 ID 生成 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 📄 许可证

[MIT License](./LICENSE)

---

## 🙏 致谢

- [Tauri](https://tauri.app/) — 轻量级桌面应用框架
- [React](https://react.dev/) — UI 框架
- [Zustand](https://zustand-demo.pmnd.rs/) — 极简状态管理
- [Lucide](https://lucide.dev/) — 精美图标

---

<div align="center">

**专注于学习，让时间有迹可循。**

Made with ❤️ by [TianLutao](https://github.com/yiqinxuantlt)

</div>

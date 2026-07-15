# 学习计时器

一款简洁的 Windows 桌面专注计时器，使用 React、TypeScript、Zustand 和 Tauri 2 构建。

## 功能

- 基于时间戳的开始、暂停、继续、停止和自动完成
- 15 分钟至 2 小时的目标时长预设
- 今日专注时长、累计时长和连续学习天数
- 历史记录查看、删除、清空和 JSON 导出
- Tauri 桌面通知、全局快捷键、窗口置顶和紧凑模式
- 浏览器开发环境使用 localStorage，桌面环境使用 Rust 原子写入 JSON

## 开发

前置要求：Node.js 18+；运行完整桌面应用和打包还需要 Rust 工具链。

```bash
npm install

# 浏览器预览
npm run dev

# Tauri 桌面开发
npm run tauri:dev

# 前端生产构建
npm run build

# 完整桌面应用构建
npm run tauri:build
```

## 目录结构

```text
src/
├── components/       # 计时环、控制区、设置、历史和窗口标题栏
├── hooks/            # 计时刷新、快捷键和窗口生命周期
├── services/         # 持久化、通知和窗口 API
├── stores/           # timerStore、statsStore、settingsStore
├── styles/           # 全局设计 token 和组件样式
├── types/            # 共享 TypeScript 类型
└── utils/            # 计时、格式化和统计纯函数
src-tauri/
├── src/lib.rs        # Tauri 命令和原子 JSON 存储
├── capabilities/    # Tauri 2 权限声明
└── tauri.conf.json   # 窗口、CSP 和打包配置
```

## 数据规则

- 只有完成且持续至少 60 秒的会话会进入统计和历史记录。
- 今日时长按会话开始日期计算，跨午夜会话不会拆分。
- 连续学习天数必须从今天开始连续向前计算。
- 桌面端数据位于 `%APPDATA%/study-timer/study_data.json`。
- 浏览器端数据位于 localStorage，便于开发预览和故障回退。

## 计时实现

计时器永远从时间戳计算经过时长，不递减一个可能漂移的秒数：

```typescript
const elapsed = Date.now() - startedAt - cumulativePausedDuration;
```

这可以正确应对窗口后台、系统休眠、暂停和应用重启恢复。

## 窗口

| 模式 | 尺寸 |
| --- | --- |
| 普通模式 | 320 × 420 |
| 紧凑模式 | 220 × 140 |

窗口无系统装饰、默认置顶，并通过自定义标题栏完成拖拽、最小化和关闭。

## 质量检查

```bash
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

`npm run lint` 和格式化脚本已保留在 package scripts 中；如果依赖未安装完整，请先运行 `npm install`。

## 许可证

MIT

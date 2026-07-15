# 学习计时器结构与核心能力优化设计

**日期：** 2026-07-16  
**状态：** 已确认实施  
**目标：** 在不引入 SQLite 和大型 UI 依赖的前提下，收敛计时状态、统计口径、持久化边界和界面结构。

## 1. 目标与边界

本次改造聚焦现有单窗口学习计时器，不扩展番茄钟、云同步、账号、多窗口或任务系统。保留普通模式、紧凑模式、科目记录、历史记录、通知、快捷键和 JSON 导出。

核心验收标准：

- 计时始终由时间戳推导，暂停、恢复、最小化、休眠和重启后不依赖计数器累加。
- 小于 60 秒的会话不保存、不计入今日时长和连续天数。
- 完成目标或用户主动停止并保存的有效会话才进入历史记录。
- 会话写入可等待、串行化，窗口关闭时不会因为异步 IPC 未完成而丢失记录。
- 前端状态按职责分离，未使用的旧组件和重复逻辑被删除。
- 普通模式和紧凑模式拥有一致的玻璃拟态视觉、可读性和交互状态。

## 2. 目标架构

```text
App
├── hooks/useTimer              # 时间戳计算与显示 tick
├── hooks/useKeyboardShortcuts  # Tauri 全局快捷键
├── hooks/useWindowManagement   # 置顶、尺寸、关闭保存
├── stores/timerStore           # 当前计时状态机
├── stores/statsStore           # 有效会话与统计
├── stores/settingsStore        # 默认设置
├── services/storageService     # Tauri JSON + localStorage 降级
├── services/notificationService# 系统通知
└── utils/timer + utils/stats   # 可独立验证的纯函数
```

`timerStore` 保留当前活动计时的 `targetDuration` 快照；`settingsStore` 的同名设置改为明确的默认目标时长。开始计时时使用快照，避免用户修改默认设置影响正在进行的会话。

## 3. 数据规则

会话继续使用毫秒时间戳以兼容现有 JSON 文件，并新增 `status` 字段。旧记录缺少该字段时按 `completed` 读取。

```typescript
type SessionStatus = 'completed' | 'cancelled';

interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
  status: SessionStatus;
}
```

统计规则：

- 只有 `status === 'completed'` 且 `duration >= 60_000` 的会话有效。
- 今日统计按会话开始日期归属，跨午夜会话完整计入开始日期。
- 连续天数按每天至少一个有效完成会话计算，从今天向前追溯。
- 删除和清空操作更新内存统计后，等待完整数据集写入后端。

## 4. 持久化与错误处理

`storageService` 负责所有 `invoke` 和 localStorage 读写。Tauri 环境使用 `get_study_data` / `save_study_data`，浏览器环境使用相同的会话 JSON 结构写入 localStorage。保存请求通过 Promise 队列串行执行，后端失败时保留 localStorage 降级副本。

窗口关闭流程先调用异步 `timerStore.stop(true)`，等待会话持久化完成，再销毁窗口。状态动作在开始异步保存前先离开 RUNNING/PAUSED，避免重复点击产生重复记录。

## 5. UI 方案

普通模式保留标题栏、圆环、控制按钮、今日统计、设置面板和历史模态框；紧凑模式保留圆环、时间、状态和最小控制按钮。统一使用蓝紫渐变、深色玻璃背景、4px 间距网格、键盘 focus-visible、禁用态和 reduced-motion。

删除未被 `App` 或其他有效入口引用的 `SubjectInput`、`DurationSelector`、`StatsCard`、`HistoryPanel` 及其样式，避免维护两套旧 UI。

## 6. 验证

- `node_modules/.bin/tsc.cmd --noEmit`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- 手动验证开始、暂停、恢复、停止、自动完成、短会话过滤、历史恢复、删除、清空、窗口关闭保存、紧凑模式和通知。

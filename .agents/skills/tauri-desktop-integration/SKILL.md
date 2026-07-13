---
name: tauri-desktop-integration
description: >
  Desktop system integration for the study timer app using Tauri 2.
  Use whenever implementing window management, system tray, notifications,
  global shortcuts, auto-start, single-instance, or Windows installer build.
  Defines the migration path from Tauri 1 (current) to Tauri 2.
  Must be loaded before writing any Tauri configuration, Rust backend code,
  or system-level integration features.
---

# Tauri Desktop Integration — 桌面系统集成

本 Skill 定义学习计时器在桌面操作系统的集成规范，涵盖窗口管理、系统托盘、通知、快捷键、自动启动等能力。

**目标平台：** Windows 10/11（优先）、macOS（兼容）

---

## 1. 技术栈升级：Tauri 1 → Tauri 2

当前项目基于 Tauri 1。本 Skill 定义升级到 **Tauri 2 + React + TypeScript + Vite** 的规范。

### 升级理由

| 能力 | Tauri 1 | Tauri 2 |
|---|---|---|
| 系统托盘 | 基础支持 | 完整 API + 原生菜单 |
| 全局快捷键 | 需要插件 | 内置支持 |
| 多窗口 | 基础 | 完善的多窗口管理 |
| 权限系统 | 宽松 | 细粒度权限声明 |
| 插件生态 | 有限 | 丰富（Store、SQL、FS 等） |
| TypeScript 支持 | 基础 | 原生 TS API |
| 移动端支持 | 无 | iOS/Android |
| 长期维护 | 维护模式 | 活跃开发 |

### 升级计划

```
Phase 1: 项目初始化
  ├── 用 create-tauri-app 创建新项目骨架
  ├── 选择 React + TypeScript + Vite 模板
  ├── 安装必要插件
  └── 配置 tauri.conf.json

Phase 2: 核心逻辑迁移
  ├── 迁移计时状态机到 TypeScript
  ├── 迁移数据持久化到 tauri-plugin-store
  └── 迁移 UI 组件到 React

Phase 3: 桌面集成
  ├── 系统托盘
  ├── 全局快捷键
  ├── 系统通知
  ├── 自动启动
  └── 单实例

Phase 4: 构建与发布
  ├── Windows 安装包（MSI/NSIS）
  └── 应用图标与签名
```

### 关键依赖

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-global-shortcut": "^2.0.0",
    "@tauri-apps/plugin-autostart": "^2.0.0",
    "@tauri-apps/plugin-single-instance": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-process": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

---

## 2. 窗口管理

### 窗口配置（tauri.conf.json）

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Study Timer",
        "width": 320,
        "height": 420,
        "minWidth": 160,
        "minHeight": 200,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "center": true,
        "skipTaskbar": false
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### 无边框窗口与拖拽

```tsx
// React: 拖拽区域组件
import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;

    // Tauri 2: data-tauri-drag-region 属性自动处理拖拽
    el.dataset.tauriDragRegion = '';
  }, []);

  return (
    <div ref={dragRef} className="title-bar">
      <span className="title-label">focus</span>
      <div className="title-bar-controls">
        <WindowControlButton />
      </div>
    </div>
  );
}
```

### 窗口置顶

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';

async function toggleAlwaysOnTop() {
  const win = getCurrentWindow();
  const isTop = await win.isAlwaysOnTop();
  await win.setAlwaysOnTop(!isTop);
}
```

### 窗口位置记忆

```typescript
import { Store } from '@tauri-apps/plugin-store';
import { getCurrentWindow } from '@tauri-apps/api/window';

const store = new Store('window-state.json');

// 保存窗口位置
async function saveWindowPosition() {
  const win = getCurrentWindow();
  const position = await win.outerPosition();
  await store.set('window-position', {
    x: position.x,
    y: position.y,
  });
  await store.save();
}

// 恢复窗口位置
async function restoreWindowPosition() {
  const pos = await store.get<{ x: number; y: number }>('window-position');
  if (!pos) return;

  const win = getCurrentWindow();
  await win.setPosition(pos.x, pos.y);
}
```

### 窗口尺寸记忆

```typescript
async function saveWindowSize() {
  const win = getCurrentWindow();
  const size = await win.outerSize();
  await store.set('window-size', {
    width: size.width,
    height: size.height,
  });
  await store.save();
}

async function restoreWindowSize() {
  const size = await store.get<{ width: number; height: number }>('window-size');
  if (!size) return;

  const win = getCurrentWindow();
  await win.setSize(size.width, size.height);
}
```

### 紧凑/正常模式切换

```typescript
const COMPACT_SIZE = { width: 160, height: 200 };
const NORMAL_SIZE = { width: 320, height: 420 };

async function toggleCompactMode() {
  const win = getCurrentWindow();
  const currentSize = await win.outerSize();

  const isCompact = currentSize.width <= COMPACT_SIZE.width;
  const targetSize = isCompact ? NORMAL_SIZE : COMPACT_SIZE;

  await win.setSize(targetSize.width, targetSize.height);

  // 存储模式偏好
  await store.set('compact-mode', !isCompact);
  await store.save();
}
```

---

## 3. 系统托盘

### 托盘配置

```rust
// src-tauri/src/lib.rs
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent, MenuEvent},
    menu::{MenuBuilder, MenuItemBuilder},
    Manager,
};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "显示计时器").build(app)?;
    let toggle = MenuItemBuilder::with_id("toggle", "开始 / 暂停").build(app)?;
    let reset = MenuItemBuilder::with_id("reset", "重置本轮").build(app)?;
    let compact = MenuItemBuilder::with_id("compact", "切换紧凑模式").build(app)?;
    let stats = MenuItemBuilder::with_id("stats", "今日统计").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show)
        .separator()
        .item(&toggle)
        .item(&reset)
        .separator()
        .item(&compact)
        .item(&stats)
        .separator()
        .item(&quit)
        .build()?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(handle_tray_menu_event)
        .on_tray_icon_event(handle_tray_icon_event)
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event(app: &tauri::AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        }
        "toggle" => {
            // 发送事件到前端，触发开始/暂停
            app.emit("tray-toggle", ()).unwrap();
        }
        "reset" => {
            app.emit("tray-reset", ()).unwrap();
        }
        "compact" => {
            app.emit("tray-compact", ()).unwrap();
        }
        "stats" => {
            app.emit("tray-stats", ()).unwrap();
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
```

### 关闭时最小化到托盘

```typescript
// frontend: 拦截关闭事件
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

async function setupCloseBehavior() {
  const win = getCurrentWindow();

  // 监听关闭请求
  await win.onCloseRequested(async (event) => {
    // 阻止默认关闭
    event.preventDefault();

    // 最小化到托盘（隐藏窗口）
    await win.hide();
  });
}

// 从托盘恢复
async function showWindow() {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}
```

### 托盘菜单定义

```
┌──────────────────────┐
│ 显示计时器            │  ← 显示/聚焦主窗口
├──────────────────────┤
│ 开始 / 暂停          │  ← 控制计时器
│ 重置本轮             │  ← 重置计时器
├──────────────────────┤
│ 切换紧凑模式          │  ← 切换窗口尺寸
│ 今日统计             │  ← 弹出统计概览
├──────────────────────┤
│ 退出                 │  ← 完全退出应用
└──────────────────────┘
```

### 托盘图标

托盘图标需要多分辨率 PNG（16×16、32×32、64×64、128×128）或 ICO 文件。

```rust
// 加载托盘图标
TrayIconBuilder::ne

---

## 10. React 与 Tauri 集成

### 10.1 Zustand 与 Tauri 事件桥接

系统托盘、全局快捷键触发的操作通过 Tauri 事件发送到前端，Zustand store 监听并响应。

```typescript
// src/stores/timerStore.ts
import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';

interface TimerStore {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  // ...其他状态
  
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: (save: boolean) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  status: 'IDLE',
  // ...其他状态
  
  start: () => { /* ... */ },
  pause: () => { /* ... */ },
  resume: () => { /* ... */ },
  stop: (save) => { /* ... */ },
  reset: () => { /* ... */ },
}));

// 监听 Tauri 事件
export async function setupTauriEventListeners() {
  // 托盘"开始/暂停"
  await listen('tray-toggle', () => {
    const { status, start, pause, resume } = useTimerStore.getState();
    if (status === 'IDLE') start();
    else if (status === 'RUNNING') pause();
    else if (status === 'PAUSED') resume();
  });

  // 托盘"重置"
  await listen('tray-reset', () => {
    useTimerStore.getState().reset();
  });

  // 托盘"切换紧凑模式"
  await listen('tray-compact', async () => {
    await toggleCompactMode();
  });

  // 托盘"今日统计"
  await listen('tray-stats', () => {
    const stats = useStatsStore.getState();
    showStatsNotification(stats);
  });
}
```

### 10.2 React 组件使用 Zustand

```tsx
// src/components/Controls.tsx
import { useTimerStore } from '../stores/timerStore';
import { Play, Pause, Square } from 'lucide-react';

export function Controls() {
  const { status, start, pause, stop } = useTimerStore();

  return (
    <div className="controls">
      <button 
        onClick={status === 'IDLE' ? start : pause}
        disabled={status !== 'IDLE' && status !== 'RUNNING'}
        className="control-btn start"
      >
        {status === 'IDLE' ? <Play /> : <Pause />}
      </button>
      <button 
        onClick={() => stop(true)}
        disabled={status !== 'RUNNING' && status !== 'PAUSED'}
        className="control-btn stop"
      >
        <Square />
      </button>
    </div>
  );
}
```

### 10.3 React Hooks 封装 Tauri API

```typescript
// src/hooks/useWindowControls.ts
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

export function useWindowControls() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    restoreWindowPosition();
    restoreWindowSize();
  }, []);

  const minimize = async () => {
    await getCurrentWindow().minimize();
  };

  const close = async () => {
    // 最小化到托盘，不退出
    await getCurrentWindow().hide();
  };

  const toggleCompact = async () => {
    await toggleCompactMode();
    setIsCompact(!isCompact);
  };

  return { minimize, close, toggleCompact, isCompact };
}
```

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { useTimerStore } from '../stores/timerStore';

export function useKeyboardShortcuts() {
  const { status, start, pause, resume, stop } = useTimerStore();

  useEffect(() => {
    register('Alt+Space', () => {
      // 显示/隐藏窗口
    });

    register('Alt+S', () => {
      if (status === 'IDLE') start();
      else if (status === 'RUNNING') pause();
      else if (status === 'PAUSED') resume();
    });

    register('Alt+R', () => {
      stop(false);
    });

    return () => {
      unregisterAll();
    };
  }, [status, start, pause, resume, stop]);
}
```

---

## 11. 完整依赖清单

```json
{
  "name": "study-timer",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest",
    "test:e2e": "wdio run wdio.conf.ts",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-global-shortcut": "^2.0.0",
    "@tauri-apps/plugin-autostart": "^2.0.0",
    "@tauri-apps/plugin-single-instance": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-sql": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@wdio/cli": "^8.0.0",
    "@wdio/local-runner": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

---

## 12. Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

---

## 13. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

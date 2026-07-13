---
name: desktop-widget-ui
description: >
  Visual design system for the desktop study timer widget.
  Use whenever creating UI components, styling elements, adjusting layouts,
  or implementing visual features for the study timer app.
  Enforces glassmorphism aesthetics, consistent spacing, Windows scaling support,
  and comprehensive interaction states. Always apply before writing any CSS or HTML.
---

# Desktop Widget UI — 视觉设计系统

本 Skill 定义桌面学习计时器的视觉语言和 UI 规范，确保每次新增组件时风格统一、质量稳定。

---

## 1. 设计原则

### 核心理念
- **低干扰**：桌面小工具不应抢占注意力，背景中优雅存在
- **高可读性**：在任何壁纸下都清晰可读
- **精致细节**：微交互克制但细腻，体现品质感
- **原生感**：符合桌面应用的交互习惯

### 视觉风格：Frosted Glass Minimalism
- 半透明毛玻璃卡片
- 大圆角与柔和阴影
- 蓝紫色主色调
- 深蓝黑文字
- 低饱和、低对比的舒适视觉

---

## 2. 色彩系统

### 主色调（蓝紫色系）

```css
:root {
  /* Primary accent */
  --accent-primary: #6366f1;       /* 靛蓝紫 - 主按钮、进度环 */
  --accent-secondary: #8b5cf6;     /* 浅紫 - hover 态、渐变终点 */
  --accent-tertiary: #a78bfa;      /* 淡紫 - 高亮、选中态 */
  
  /* Glass surfaces */
  --glass-bg: rgba(15, 15, 25, 0.75);       /* 毛玻璃背景 */
  --glass-bg-light: rgba(25, 25, 40, 0.65); /* 浅色毛玻璃 */
  --glass-border: rgba(255, 255, 255, 0.08); /* 玻璃边框 */
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  
  /* Text colors */
  --text-primary: #e8eaf6;         /* 主文字 - 淡蓝白 */
  --text-secondary: rgba(232, 234, 246, 0.7); /* 次要文字 */
  --text-muted: rgba(232, 234, 246, 0.4);     /* 辅助文字 */
  
  /* Semantic colors */
  --success: #10b981;              /* 成功/开始 */
  --warning: #f59e0b;              /* 警告 */
  --danger: #ef4444;               /* 危险/停止 */
}
```

### 深色/浅色壁纸适配

```css
/* 自动检测壁纸亮度并调整毛玻璃透明度 */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(10, 10, 18, 0.8);
    --glass-border: rgba(255, 255, 255, 0.06);
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --glass-bg: rgba(255, 255, 255, 0.85);
    --glass-border: rgba(0, 0, 0, 0.08);
    --text-primary: #1e1b4b;
    --text-secondary: rgba(30, 27, 75, 0.7);
  }
}
```

---

## 3. 毛玻璃效果

### 标准玻璃卡片

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
}
```

### 玻璃层级
- **Level 1（基础）**：`blur(12px)` + `saturate(150%)`，用于容器背景
- **Level 2（标准）**：`blur(20px)` + `saturate(180%)`，用于卡片、面板
- **Level 3（强调）**：`blur(28px)` + `saturate(200%)`，用于弹出层、模态框

---

## 4. 圆角与阴影

### 圆角系统

```css
:root {
  --radius-xs: 4px;    /* 小标签、徽章 */
  --radius-sm: 8px;    /* 输入框、小按钮 */
  --radius-md: 12px;   /* 卡片、面板 */
  --radius-lg: 16px;   /* 容器、主卡片 */
  --radius-xl: 20px;   /* 大型容器 */
  --radius-full: 9999px; /* 圆形按钮、进度环 */
}
```

### 阴影系统

```css
:root {
  /* 基础阴影 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.4);
  
  /* 玻璃阴影（带颜色） */
  --shadow-glass: 
    0 8px 32px rgba(99, 102, 241, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  
  /* 发光阴影（hover/active） */
  --shadow-glow: 0 0 24px rgba(99, 102, 241, 0.4);
}
```

---

## 5. 排版系统

### 字体

```css
:root {
  --font-primary: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
}
```

### 字号层级

```css
:root {
  --text-xs: 10px;    /* 标签、辅助信息 */
  --text-sm: 12px;    /* 次要文字、按钮 */
  --text-md: 14px;    /* 正文、输入框 */
  --text-lg: 18px;    /* 强调文字 */
  --text-xl: 24px;    /* 标题 */
  --text-2xl: 32px;   /* 大号时间显示 */
  --text-3xl: 48px;   /* 紧凑模式时间 */
  --text-4xl: 64px;   /* 正常模式时间 */
}
```

### 字重

```css
:root {
  --font-light: 300;
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
}
```

### 行高

```css
:root {
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## 6. 间距系统

### 8px 网格

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 使用原则
- 所有间距必须是 4px 的倍数
- 组件内部用 `--space-2` / `--space-4`
- 组件之间用 `--space-4` / `--space-6`
- 区块之间用 `--space-8` / `--space-12`

---

## 7. 组件规范

### 按钮层级

#### 主按钮（Primary）
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: var(--radius-full);
  padding: var(--space-3) var(--space-6);
  font-weight: var(--font-medium);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-normal) var(--ease-out);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

#### 次要按钮（Secondary）
```css
.btn-secondary {
  background: var(--glass-bg-light);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  padding: var(--space-3) var(--space-6);
  transition: all var(--duration-normal) var(--ease-out);
}

.btn-secondary:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-hover);
}
```

#### 图标按钮（Icon）
```css
.btn-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-normal) var(--ease-out);
}

.btn-icon:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
  transform: scale(1.05);
}

.btn-icon:active {
  transform: scale(0.98);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}
```

### 圆形进度环

```css
.progress-ring {
  position: relative;
  width: 160px;
  height: 160px;
}

.progress-ring svg {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(99, 102, 241, 0.2);
  stroke-width: 4;
}

.progress-ring-fill {
  fill: none;
  stroke: url(#progressGradient);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s var(--ease-out);
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
}

/* 渐变定义 */
<linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#6366f1"/>
  <stop offset="100%" stop-color="#8b5cf6"/>
</linearGradient>
```

### 输入框

```css
.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-md);
  font-family: var(--font-primary);
  transition: all var(--duration-normal) var(--ease-out);
}

.input-field::placeholder {
  color: var(--text-muted);
}

.input-field:hover {
  border-color: var(--glass-border-hover);
}

.input-field:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
```

---

## 8. 交互状态

所有可交互元素必须包含完整的 `hover`、`active`、`focus`、`disabled` 状态。

### 状态定义

| 状态 | 视觉表现 |
|---|---|
| **default** | 基础样式 |
| **hover** | 轻微上移（-1px）、阴影增强、颜色提亮 |
| **active** | 轻微下移（+1px）、阴影减弱、颜色加深 |
| **focus** | outline 环绕（仅键盘导航可见） |
| **disabled** | opacity: 0.3、cursor: not-allowed、禁用所有变换 |

### Focus-visible 规范

```css
/* 只在键盘导航时显示 outline */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* 鼠标点击时不显示 outline */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 过渡动画
	
	```css
	:root {
	  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
	  --ease-in: cubic-bezier(0.55, 0, 1, 0.45);
	  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
	  --duration-fast: 150ms;
	  --duration-normal: 250ms;
	  --duration-slow: 400ms;
	}
	```
	
	---
	
	## 9. 动画原则
	
	### 核心理念
	本应用是桌面工具，动画应该克制、实用、不打扰。优先使用 CSS Transition，不依赖大型动画库。
	
	### 动画用途与实现对照
	
	| 场景 | 实现方式 | 说明 |
	|---|---|---|
	| 进度环填充 | `transition: stroke-dashoffset 0.5s var(--ease-out)` | 平滑追踪时间流逝 |
	| 按钮按压反馈 | `transition: transform 0.15s, box-shadow 0.15s` | hover 上移 -1px，active 回位 |
	| 窗口模式切换 | CSS Transition on `width`/`height` | 紧凑/正常模式之间过渡 |
	| 完成时脉冲 | `@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }` | 仅 2-3 次脉冲，不持续闪烁 |
	| 面板展开/收起 | `transition: max-height 0.3s ease-out, opacity 0.2s` | 配合 `overflow: hidden` |
	| 统计数字更新 | `transition: opacity 0.2s` | 数字变化时淡入淡出 |
	| 状态标签切换 | `transition: color 0.2s` | 颜色平滑切换（如 focusing→paused） |
	
	### 规则
	- **优先 CSS Transition**，在所有简单场景中使用
	- **不触发 Layout**：只过渡 `transform` 和 `opacity`，不直接过渡 `width`/`height`/`top`/`left`
	- **窗口 resize 例外**：窗口尺寸变化不可避免触发 layout，使用 CSS Transition 平滑即可
	- **复杂模式切换**（如设置面板动画展开）：如果 CSS 无法满足，引入 `framer-motion`，但只用于这一场景
	- **尊重 `prefers-reduced-motion`**：
	```css
	@media (prefers-reduced-motion: reduce) {
	  *, *::before, *::after {
	    animation-duration: 0.01ms !important;
	    transition-duration: 0.01ms !important;
	  }
	}
	```
	
	### 反模式
	- ❌ 使用 `setInterval` 驱动动画帧
	- ❌ 为动画引入 GSAP / Anime.js 等重型库
	- ❌ 进度环数值变化时使用 CSS `animation`（用 `transition` 即可）
	- ❌ 计时数字本身用动画效果（数字实时更新不需要动画）
	
	---
	
	## 10. Windows 缩放适配
	
	### DPI 缩放
	```css
	/* 基础缩放比例 */
	:root {
	  --scale-factor: 1;
	}
	
	/* 使用 Tauri 2 API 获取缩放比 */
	/* window.scaleFactor() 返回 1.0, 1.25, 1.5, 1.75, 2.0 等 */
	
	/* 缩放适配方案 */
	@media (resolution: 1.25dppx) { :root { --scale-factor: 1.25; } }
	@media (resolution: 1.5dppx)  { :root { --scale-factor: 1.5; } }
	@media (resolution: 2dppx)    { :root { --scale-factor: 2; } }
	```
	
	### 布局适配
	- 100% (96dpi)：标准布局，320×420
	- 125% (120dpi)：适当缩小间距，保证内容可见
	- 150% (144dpi)：启用紧凑模式的备选
	- 200% (192dpi)：必须启用紧凑模式，否则内容溢出
	
	---
	
	## 11. 紧凑模式（Compact Mode）
	
	### 布局规格
	- **正常模式**：320×420，显示完整功能
	- **紧凑模式**：160×200，仅显示计时环 + 时间 + 状态标签
	
	### 紧凑模式组件结构
	```
	┌─────────────────────────────┐
	│        进度环（缩小）          │  80×80
	│       ┌──────────────┐       │
	│       │  00:32:15    │       │  时间文字（--text-3xl: 48px）
	│       │  focusing    │       │  状态标签（--text-xs: 10px）
	│       └──────────────┘       │
	└─────────────────────────────┘
	```
	
	### 隐藏元素
	- ❌ 科目输入框
	- ❌ 开始/暂停/停止按钮（用全局快捷键代替）
	- ❌ 统计卡片
	- ❌ 历史记录面板
	- ❌ 标题栏

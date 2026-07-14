# 主界面精简与历史记录分离 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简主界面为核心计时功能，历史记录移入模态框，添加右键菜单，完全移除紧凑模式。

**Architecture:** React 18 + TypeScript + Zustand 状态管理。移除 CompactTimer、SubjectInput、DurationSelector、StatsCard、HistoryPanel，新增 TodayStats、ContextMenu、HistoryModal，改造 TitleBar 增加科目编辑和历史入口。

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tauri 2, CSS Modules

---

## 文件结构

### 创建
- `src/components/TodayStats.tsx` — 主界面底部今日专注时长显示
- `src/components/TodayStats.module.css` — 样式
- `src/components/ContextMenu.tsx` — 右键菜单组件
- `src/components/ContextMenu.module.css` — 右键菜单样式
- `src/components/HistoryModal.tsx` — 历史记录全屏模态框
- `src/components/HistoryModal.module.css` — 模态框样式

### 修改
- `src/App.tsx` — 移除被替换组件，添加右键菜单和模态框
- `src/components/TitleBar.tsx` — 增加科目编辑和历史按钮
- `src/components/TitleBar.module.css` — 科目标签样式
- `src/stores/settingsStore.ts` — 添加 recentSubjects 字段

### 删除
- `src/components/CompactTimer.tsx`
- `src/components/CompactTimer.module.css`

### 保留但不在主界面使用
- `src/components/SubjectInput.tsx` — 功能移入 TitleBar
- `src/components/DurationSelector.tsx` — 仅通过 SettingsPanel 访问
- `src/components/StatsCard.tsx` — 统计移入 HistoryModal
- `src/components/StatsCard.module.css`
- `src/components/HistoryPanel.tsx` — 逻辑移植到 HistoryModal
- `src/components/HistoryPanel.module.css`

---

## Task 1: 移除紧凑模式

**Files:**
- Delete: `src/components/CompactTimer.tsx`
- Delete: `src/components/CompactTimer.module.css`
- Modify: `src/App.tsx:12,231-237`

- [ ] **Step 1: 删除 CompactTimer 文件**

删除以下文件：
- `src/components/CompactTimer.tsx`
- `src/components/CompactTimer.module.css`

- [ ] **Step 2: 清理 App.tsx 中的 CompactTimer 引用**

打开 `src/App.tsx`，删除以下内容：

1. 删除 import（第 12 行）：
```typescript
import CompactTimer from './components/CompactTimer';
```

2. 删除 compactMode 使用（第 21 行）：
```typescript
const { compactMode, alwaysOnTop, globalShortcutsEnabled } = useSettingsStore();
// 改为：
const { alwaysOnTop, globalShortcutsEnabled } = useSettingsStore();
```

3. 删除窗口尺寸调整 effect（第 203-216 行）：
```typescript
  // Apply compact mode window resize (only in Tauri)
  useEffect(() => {
    if (!inTauri) return;
    const applyWindowSize = async () => {
      const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (compactMode) {
        appWindow.setSize(new LogicalSize(220, 140)).catch(console.error);
      } else {
        appWindow.setSize(new LogicalSize(320, 420)).catch(console.error);
      }
    };
    applyWindowSize();
  }, [compactMode, inTauri]);
```

4. 删除紧凑模式渲染分支（第 231-237 行）：
```typescript
  if (compactMode) {
    return (
      <div className={containerClass}>
        <CompactTimer />
      </div>
    );
  }
```

最终 App.tsx 主渲染应为：
```tsx
  return (
    <div className={containerClass}>
      <TitleBar onOpenSettings={() => setSettingsOpen(true)} />

      <div className="main-content">
        <div className="timer-section">
          <TimerRing progress={progress} status={status} elapsed={elapsed} />
        </div>

        <SubjectInput />
        <DurationSelector />
        <Controls />
        <StatsCard />
        <HistoryPanel />
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
```

- [ ] **Step 3: 验证构建**

```bash
npm run typecheck
npm run dev
```

预期：无 TypeScript 错误，应用正常运行，无紧凑模式切换功能。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "refactor: remove compact mode (broken implementation)"
```

---

## Task 2: 添加 recentSubjects 到 settingsStore

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/types/index.ts:36-42`

- [ ] **Step 1: 扩展 AppSettings 类型**

打开 `src/types/index.ts`，修改 `AppSettings` 接口：

```typescript
export interface AppSettings {
  targetDuration: number;
  compactMode: boolean;
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
  globalShortcutsEnabled: boolean;
  recentSubjects: string[]; // 新增
}
```

- [ ] **Step 2: 更新 settingsStore 默认值和方法**

打开 `src/stores/settingsStore.ts`，修改：

```typescript
interface SettingsState extends AppSettings {
  setTargetDuration: (ms: number) => void;
  toggleCompactMode: () => void;
  toggleAlwaysOnTop: () => void;
  toggleNotification: () => void;
  toggleGlobalShortcuts: () => void;
  addRecentSubject: (subject: string) => void; // 新增
}

const defaultSettings: AppSettings = {
  targetDuration: 3600000,
  compactMode: false,
  alwaysOnTop: true,
  notificationEnabled: true,
  globalShortcutsEnabled: false,
  recentSubjects: [], // 新增
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setTargetDuration: (ms) => set({ targetDuration: ms }),
      toggleCompactMode: () => {
        const newCompactMode = !get().compactMode;
        set({ compactMode: newCompactMode });
      },
      toggleAlwaysOnTop: () => {
        const newOnTop = !get().alwaysOnTop;
        set({ alwaysOnTop: newOnTop });
      },
      toggleNotification: () =>
        set({ notificationEnabled: !get().notificationEnabled }),
      toggleGlobalShortcuts: () =>
        set({ globalShortcutsEnabled: !get().globalShortcutsEnabled }),
      
      // 新增方法
      addRecentSubject: (subject) => {
        const trimmed = subject.trim();
        if (!trimmed) return;
        
        const current = get().recentSubjects;
        // 移除重复项（不区分大小写）
        const filtered = current.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        // 添加到头部，最多保留 5 个
        const updated = [trimmed, ...filtered].slice(0, 5);
        set({ recentSubjects: updated });
      },
    }),
    {
      name: 'study-timer-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

- [ ] **Step 3: 验证类型检查**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add src/types/index.ts src/stores/settingsStore.ts
git commit -m "feat: add recentSubjects to settings store"
```

---

## Task 3: 创建 TodayStats 组件

**Files:**
- Create: `src/components/TodayStats.tsx`
- Create: `src/components/TodayStats.module.css`

- [ ] **Step 1: 创建 TodayStats.tsx**

创建文件 `src/components/TodayStats.tsx`：

```typescript
import { memo } from 'react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import styles from './TodayStats.module.css';

function TodayStats() {
  const { todayTotal } = useStatsStore();
  const duration = formatDuration(todayTotal);

  return (
    <div className={styles.container}>
      <span className={styles.label}>今日专注</span>
      <span className={styles.value}>{duration}</span>
    </div>
  );
}

export default memo(TodayStats);
```

- [ ] **Step 2: 创建 TodayStats.module.css**

创建文件 `src/components/TodayStats.module.css`：

```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: var(--weight-medium);
}

.value {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: 验证构建**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/TodayStats.tsx src/components/TodayStats.module.css
git commit -m "feat: add TodayStats component"
```

---

## Task 4: 创建 ContextMenu 组件

**Files:**
- Create: `src/components/ContextMenu.tsx`
- Create: `src/components/ContextMenu.module.css`

- [ ] **Step 1: 创建 ContextMenu.tsx**

创建文件 `src/components/ContextMenu.tsx`：

```typescript
import { memo, useEffect, useRef } from 'react';
import { History, Settings, Pin, Info } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

function ContextMenu({ x, y, onClose, onOpenHistory, onOpenSettings }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { alwaysOnTop, toggleAlwaysOnTop } = useSettingsStore();

  // 调整位置防止溢出窗口
  useEffect(() => {
    if (!menuRef.current) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + rect.width > windowWidth - 8) {
      adjustedX = windowWidth - rect.width - 8;
    }
    if (y + rect.height > windowHeight - 8) {
      adjustedY = windowHeight - rect.height - 8;
    }
    
    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [x, y]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleHistory = () => {
    onOpenHistory();
    onClose();
  };

  const handleSettings = () => {
    onOpenSettings();
    onClose();
  };

  const handlePin = () => {
    toggleAlwaysOnTop();
    onClose();
  };

  const handleAbout = () => {
    alert('学习计时器 v1.0\n\n专注学习，高效管理时间');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        ref={menuRef} 
        className={styles.menu}
        onClick={(e) => e.stopPropagation()}
        style={{ left: x, top: y }}
      >
        <button className={styles.item} onClick={handleHistory}>
          <History size={14} />
          <span>历史记录</span>
        </button>
        <button className={styles.item} onClick={handleSettings}>
          <Settings size={14} />
          <span>设置</span>
        </button>
        <button className={styles.item} onClick={handlePin}>
          <Pin size={14} />
          <span>置顶窗口</span>
          {alwaysOnTop && <span className={styles.check}>✓</span>}
        </button>
        <div className={styles.divider} />
        <button className={styles.item} onClick={handleAbout}>
          <Info size={14} />
          <span>关于</span>
        </button>
      </div>
    </div>
  );
}

export default memo(ContextMenu);
```

- [ ] **Step 2: 创建 ContextMenu.module.css**

创建文件 `src/components/ContextMenu.module.css`：

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.menu {
  position: fixed;
  width: 160px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  padding: var(--space-1);
  animation: fadeIn 0.15s var(--ease-out);
  z-index: 201;
}

@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: scale(0.95);
  }
  to { 
    opacity: 1; 
    transform: scale(1);
  }
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: 36px;
  padding: 0 var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.item:hover {
  background: var(--glass-bg-light);
  color: var(--text-primary);
}

.item:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.check {
  margin-left: auto;
  color: var(--accent-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}

.divider {
  height: 1px;
  background: var(--glass-border);
  margin: var(--space-1) 0;
}
```

- [ ] **Step 3: 验证构建**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/ContextMenu.tsx src/components/ContextMenu.module.css
git commit -m "feat: add ContextMenu component for right-click menu"
```

---

## Task 5: 创建 HistoryModal 组件

**Files:**
- Create: `src/components/HistoryModal.tsx`
- Create: `src/components/HistoryModal.module.css`

- [ ] **Step 1: 创建 HistoryModal.tsx**

创建文件 `src/components/HistoryModal.tsx`：

```typescript
import { memo, useState } from 'react';
import { X, Trash2, Download, Clock, Flame } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import type { FocusSession } from '../types';
import styles from './HistoryModal.module.css';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedSessions {
  date: string;
  sessions: FocusSession[];
  totalMs: number;
}

function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { sessions, todayTotal, currentStreak, deleteSession, clearAllSessions } = useStatsStore();

  if (!isOpen) return null;

  // Sort sessions by end time, most recent first
  const sortedSessions = [...sessions].sort((a, b) => b.endedAt - a.endedAt);

  // Group sessions by date
  const groupedSessions: GroupedSessions[] = [];
  const dateGroups = new Map<string, typeof sessions>();

  for (const session of sortedSessions) {
    const dateKey = new Date(session.endedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(session);
  }

  for (const [date, dateSessions] of dateGroups) {
    groupedSessions.push({
      date,
      sessions: dateSessions,
      totalMs: dateSessions.reduce((sum, s) => sum + s.duration, 0),
    });
  }

  const handleDelete = (id: string) => {
    deleteSession(id);
  };

  const handleClearAll = () => {
    if (showClearConfirm) {
      clearAllSessions();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleExport = () => {
    const data = sessions.map(s => ({
      id: s.id,
      subject: s.subject,
      startedAt: new Date(s.startedAt).toISOString(),
      endedAt: new Date(s.endedAt).toISOString(),
      durationSeconds: Math.floor(s.duration / 1000),
      durationFormatted: formatDuration(s.duration),
      targetDurationSeconds: Math.floor(s.targetDuration / 1000),
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-timer-records-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayDuration = formatDuration(todayTotal);
  const streakText = currentStreak > 0 ? `${currentStreak} 天` : '-';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>📜 历史记录</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <Clock size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>今日专注</span>
            <span className={styles.statValue}>{todayDuration}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Flame size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>连续</span>
            <span className={styles.statValue}>{streakText}</span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {sortedSessions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📭</div>
              <span className={styles.emptyText}>开始你的第一次专注</span>
              <span className={styles.emptyHint}>完成的记录会显示在这里</span>
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {groupedSessions.map((group) => (
                  <div key={group.date} className={styles.group}>
                    <div className={styles.groupHeader}>
                      <span className={styles.groupDate}>{group.date}</span>
                      <span className={styles.groupTotal}>{formatDuration(group.totalMs)}</span>
                    </div>
                    {group.sessions.map((session, index) => (
                      <div
                        key={session.id}
                        className={styles.item}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className={styles.itemLeft}>
                          <span className={styles.time}>
                            {formatTime(session.endedAt)}
                          </span>
                          <span className={styles.subject}>
                            {session.subject || '未命名'}
                          </span>
                        </div>
                        <div className={styles.itemRight}>
                          <span className={styles.duration}>
                            {formatDuration(session.duration)}
                          </span>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(session.id)}
                            title="删除此记录"
                            aria-label="删除记录"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={handleExport}
                  title="导出 JSON"
                >
                  <Download size={12} />
                  <span>导出 JSON</span>
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={handleClearAll}
                >
                  {showClearConfirm ? '确认清空？' : '清空所有'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default memo(HistoryModal);
```

- [ ] **Step 2: 创建 HistoryModal.module.css**

创建文件 `src/components/HistoryModal.module.css`：

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn 0.15s var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  animation: slideUp 0.2s var(--ease-out);
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.title {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}

.closeButton {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.closeButton:hover {
  background: var(--glass-bg-light);
  color: var(--text-primary);
}

.stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--glass-bg-light);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.statItem {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.statIcon {
  color: var(--accent-tertiary);
}

.statLabel {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.statValue {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.statDivider {
  width: 1px;
  height: 16px;
  background: var(--glass-border);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6);
  text-align: center;
}

.emptyIcon {
  font-size: 32px;
  margin-bottom: var(--space-2);
}

.emptyText {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
}

.emptyHint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.groupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
}

.groupDate {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
}

.groupTotal {
  font-size: var(--text-xs);
  color: var(--accent-tertiary);
  font-variant-numeric: tabular-nums;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  animation: fadeInItem 0.3s var(--ease-out) both;
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.item:hover {
  background: rgba(30, 30, 50, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

@keyframes fadeInItem {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.itemLeft {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.itemRight {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.subject {
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duration {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.deleteBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all var(--duration-fast) var(--ease-out);
}

.item:hover .deleteBtn {
  opacity: 1;
}

.deleteBtn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.actionBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.actionBtn:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
  border-color: var(--glass-border-hover);
}

.actionBtnDanger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--danger);
}

/* Scrollbar */
.list::-webkit-scrollbar {
  width: 4px;
}

.list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

.list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 3: 验证构建**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/HistoryModal.tsx src/components/HistoryModal.module.css
git commit -m "feat: add HistoryModal component with full-screen history view"
```

---

## Task 6: 改造 TitleBar 组件

**Files:**
- Modify: `src/components/TitleBar.tsx`
- Modify: `src/components/TitleBar.module.css`

- [ ] **Step 1: 修改 TitleBar.tsx**

打开 `src/components/TitleBar.tsx`，完整替换为：

```typescript
import { memo, useEffect, useState, useRef } from 'react';
import { Minus, X, Pin, Settings, History, ChevronDown } from 'lucide-react';
import { isTauri } from '../lib/platform';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
}

function TitleBar({ onOpenSettings, onOpenHistory }: TitleBarProps) {
  const [inTauri, setInTauri] = useState(false);
  const { alwaysOnTop, toggleAlwaysOnTop, recentSubjects, addRecentSubject } = useSettingsStore();
  const { subject, setSubject, status } = useTimerStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subject);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  // 同步 subject 到编辑框
  useEffect(() => {
    setEditValue(subject);
  }, [subject]);

  // 编辑模式下自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!showDropdown) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleMinimize = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleSubjectClick = () => {
    if (isRunning) return; // 计时中禁止编辑
    setIsEditing(true);
    setShowDropdown(false);
  };

  const handleSubjectBlur = () => {
    const trimmed = editValue.trim() || '学习';
    setSubject(trimmed);
    addRecentSubject(trimmed);
    setEditValue(trimmed);
    setIsEditing(false);
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(subject);
      setIsEditing(false);
    }
  };

  const handleDropdownToggle = () => {
    if (isRunning) return;
    setShowDropdown(!showDropdown);
  };

  const handleSelectRecent = (s: string) => {
    setSubject(s);
    setEditValue(s);
    addRecentSubject(s);
    setShowDropdown(false);
  };

  const isRunning = status === 'RUNNING' || status === 'PAUSED';

  if (!inTauri) return null;

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.left} data-tauri-drag-region>
        <div className={styles.subjectWrapper} ref={dropdownRef}>
          {isEditing ? (
            <input
              ref={inputRef}
              className={styles.subjectInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSubjectBlur}
              onKeyDown={handleSubjectKeyDown}
              placeholder="输入科目"
              maxLength={20}
            />
          ) : (
            <button
              className={`${styles.subjectButton} ${isRunning ? styles.subjectButtonDisabled : ''}`}
              onClick={handleSubjectClick}
              disabled={isRunning}
              aria-label="编辑科目"
            >
              <span className={styles.subjectText}>{subject}</span>
              {!isRunning && (
                <ChevronDown size={10} className={styles.dropdownArrow} />
              )}
            </button>
          )}
          
          {/* 最近科目下拉 */}
          {showDropdown && recentSubjects.length > 0 && !isEditing && (
            <div className={styles.dropdown}>
              {recentSubjects.map((s, i) => (
                <button
                  key={i}
                  className={styles.dropdownItem}
                  onClick={() => handleSelectRecent(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.controls}>
        <button
          className={`${styles.button} ${alwaysOnTop ? styles.buttonActive : ''}`}
          onClick={toggleAlwaysOnTop}
          aria-label={alwaysOnTop ? '取消置顶' : '置顶'}
          title={alwaysOnTop ? '取消置顶' : '置顶'}
        >
          <Pin size={12} />
        </button>
        {onOpenSettings && (
          <button
            className={styles.button}
            onClick={onOpenSettings}
            aria-label="设置"
            title="设置"
          >
            <Settings size={12} />
          </button>
        )}
        {onOpenHistory && (
          <button
            className={styles.button}
            onClick={onOpenHistory}
            aria-label="历史记录"
            title="历史记录"
          >
            <History size={12} />
          </button>
        )}
        <button
          className={styles.button}
          onClick={handleMinimize}
          aria-label="最小化"
        >
          <Minus size={12} />
        </button>
        <button
          className={`${styles.button} ${styles.closeButton}`}
          onClick={handleClose}
          aria-label="关闭"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default memo(TitleBar);
```

- [ ] **Step 2: 修改 TitleBar.module.css**

打开 `src/components/TitleBar.module.css`，在文件末尾添加以下样式：

```css
/* Subject editing */
.subjectWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.subjectButton {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.subjectButton:hover:not(.subjectButtonDisabled) {
  background: var(--glass-bg-light);
  color: var(--text-primary);
}

.subjectButtonDisabled {
  cursor: default;
  opacity: 0.6;
}

.subjectText {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdownArrow {
  opacity: 0.5;
  transition: transform var(--duration-fast) var(--ease-out);
}

.subjectButton:hover:not(.subjectButtonDisabled) .dropdownArrow {
  opacity: 1;
}

.subjectInput {
  width: 100px;
  padding: var(--space-1) var(--space-2);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border-hover);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-family: inherit;
  outline: none;
}

.subjectInput::placeholder {
  color: var(--text-muted);
}

.subjectInput:focus {
  border-color: var(--accent-primary);
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 120px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  padding: var(--space-1);
  z-index: 50;
  animation: fadeIn 0.15s var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdownItem {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.dropdownItem:hover {
  background: var(--glass-bg-light);
  color: var(--text-primary);
}
```

- [ ] **Step 3: 验证构建**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/TitleBar.tsx src/components/TitleBar.module.css
git commit -m "feat: add subject editing and history button to TitleBar"
```

---

## Task 7: 清理 SettingsPanel 中的紧凑模式选项

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.module.css`

- [ ] **Step 1: 移除紧凑模式切换**

打开 `src/components/SettingsPanel.tsx`，修改：

1. 移除 compactMode 相关：
```typescript
function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    targetDuration,
    setTargetDuration,
    // compactMode,          // 删除
    // toggleCompactMode,    // 删除
    alwaysOnTop,
    toggleAlwaysOnTop,
    notificationEnabled,
    toggleNotification,
    globalShortcutsEnabled,
    toggleGlobalShortcuts,
  } = useSettingsStore();
```

2. 移除窗口设置中的紧凑模式项（第 77-90 行）：
```tsx
          {/* 窗口设置 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Layers size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>窗口</span>
            </div>
            <div className={styles.toggleList}>
              {/* 删除紧凑模式项 */}
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>窗口置顶</span>
                  <span className={styles.toggleHint}>保持在其他窗口之上</span>
                </div>
                <button
                  className={`${styles.toggle} ${alwaysOnTop ? styles.toggleActive : ''}`}
                  onClick={toggleAlwaysOnTop}
                  role="switch"
                  aria-checked={alwaysOnTop}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
            </div>
          </div>
```

最终 SettingsPanel.tsx 应如下（简化版）：
```typescript
import { memo } from 'react';
import { X, Bell, Keyboard, Timer, Layers, Pin } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { label: '15 分钟', value: 15 * 60 * 1000 },
  { label: '30 分钟', value: 30 * 60 * 1000 },
  { label: '45 分钟', value: 45 * 60 * 1000 },
  { label: '1 小时', value: 60 * 60 * 1000 },
  { label: '1.5 小时', value: 90 * 60 * 1000 },
  { label: '2 小时', value: 120 * 60 * 1000 },
];

function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    targetDuration,
    setTargetDuration,
    alwaysOnTop,
    toggleAlwaysOnTop,
    notificationEnabled,
    toggleNotification,
    globalShortcutsEnabled,
    toggleGlobalShortcuts,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>设置</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭设置"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 目标时长 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Timer size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>目标时长</span>
            </div>
            <div className={styles.durationGrid}>
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.durationButton} ${targetDuration === opt.value ? styles.durationButtonActive : ''}`}
                  onClick={() => setTargetDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 窗口设置 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Layers size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>窗口</span>
            </div>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>窗口置顶</span>
                  <span className={styles.toggleHint}>保持在其他窗口之上</span>
                </div>
                <button
                  className={`${styles.toggle} ${alwaysOnTop ? styles.toggleActive : ''}`}
                  onClick={toggleAlwaysOnTop}
                  role="switch"
                  aria-checked={alwaysOnTop}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
            </div>
          </div>

          {/* 通知与快捷键 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Bell size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>通知与快捷键</span>
            </div>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>桌面通知</span>
                  <span className={styles.toggleHint}>完成时发送通知</span>
                </div>
                <button
                  className={`${styles.toggle} ${notificationEnabled ? styles.toggleActive : ''}`}
                  onClick={toggleNotification}
                  role="switch"
                  aria-checked={notificationEnabled}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>全局快捷键</span>
                  <span className={styles.toggleHint}>Ctrl+Alt+Space 播放/暂停，Ctrl+Alt+S 停止</span>
                </div>
                <button
                  className={`${styles.toggle} ${globalShortcutsEnabled ? styles.toggleActive : ''}`}
                  onClick={toggleGlobalShortcuts}
                  role="switch"
                  aria-checked={globalShortcutsEnabled}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsPanel);
```

- [ ] **Step 2: 验证构建**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "refactor: remove compact mode toggle from SettingsPanel"
```

---

## Task 8: 清理 App.tsx 主界面

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 更新 imports 和状态**

打开 `src/App.tsx`，修改 imports：

```typescript
import { useState, useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTimerStore, useElapsed, useProgress } from './stores/timerStore';
import { useStatsStore } from './stores/statsStore';
import TitleBar from './components/TitleBar';
import TimerRing from './components/TimerRing';
import Controls from './components/Controls';
import TodayStats from './components/TodayStats';
import ContextMenu from './components/ContextMenu';
import HistoryModal from './components/HistoryModal';
import SettingsPanel from './components/SettingsPanel';
import { isTauri } from './lib/platform';
```

删除：SubjectInput, DurationSelector, StatsCard, HistoryPanel

- [ ] **Step 2: 添加右键菜单和模态框状态**

在 App 函数内添加状态：

```typescript
function App() {
  const { status } = useTimerStore();
  const elapsed = useElapsed();
  const progress = useProgress();
  const { loaded, loadFromStorage } = useStatsStore();
  const { alwaysOnTop, globalShortcutsEnabled } = useSettingsStore();
  const [, setTick] = useState(0);
  const [inTauri, setInTauri] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ... 其他 useEffect 保持不变
```

- [ ] **Step 3: 添加右键菜单处理函数**

在 useEffect 之前添加：

```typescript
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };
```

- [ ] **Step 4: 更新主渲染**

将 return 语句改为：

```tsx
  const containerClass = `app-container ${status === 'RUNNING' ? 'app-running' : ''} ${status === 'PAUSED' ? 'app-paused' : ''} ${status === 'COMPLETED' ? 'app-completed' : ''}`;

  return (
    <div className={containerClass} onContextMenu={handleContextMenu}>
      <TitleBar 
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="main-content">
        <div className="timer-section">
          <TimerRing progress={progress} status={status} elapsed={elapsed} />
        </div>

        <Controls />
        <TodayStats />
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
    </div>
  );
```

- [ ] **Step 5: 完整的 App.tsx**

确保文件最终如下（保留所有 effect）：

```typescript
import { useState, useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTimerStore, useElapsed, useProgress } from './stores/timerStore';
import { useStatsStore } from './stores/statsStore';
import TitleBar from './components/TitleBar';
import TimerRing from './components/TimerRing';
import Controls from './components/Controls';
import TodayStats from './components/TodayStats';
import ContextMenu from './components/ContextMenu';
import HistoryModal from './components/HistoryModal';
import SettingsPanel from './components/SettingsPanel';
import { isTauri } from './lib/platform';

function App() {
  const { status } = useTimerStore();
  const elapsed = useElapsed();
  const progress = useProgress();
  const { loaded, loadFromStorage } = useStatsStore();
  const { alwaysOnTop, globalShortcutsEnabled } = useSettingsStore();
  const [, setTick] = useState(0);
  const [inTauri, setInTauri] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Initialize Tauri detection
  useEffect(() => {
    isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  // Keyboard shortcuts (only in Tauri) - with modifier keys for safety
  useEffect(() => {
    if (!inTauri || !globalShortcutsEnabled) return;

    let isRegistered = false;
    const SHORTCUTS = {
      playPause: 'Ctrl+Alt+Space',
      stop: 'Ctrl+Alt+S',
    };

    const registerShortcuts = async () => {
      try {
        const { register } = await import('@tauri-apps/plugin-global-shortcut');
        const { start, pause, resume, stop } = useTimerStore.getState();

        await register(SHORTCUTS.playPause, () => {
          const currentStatus = useTimerStore.getState().status;
          if (currentStatus === 'IDLE' || currentStatus === 'COMPLETED') {
            start();
          } else if (currentStatus === 'RUNNING') {
            pause();
          } else if (currentStatus === 'PAUSED') {
            resume();
          }
        });

        await register(SHORTCUTS.stop, () => {
          const currentStatus = useTimerStore.getState().status;
          if (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') {
            stop(true);
          }
        });

        isRegistered = true;
      } catch (error) {
        console.error('Failed to register shortcuts:', error);
      }
    };

    registerShortcuts();

    return () => {
      if (isRegistered) {
        import('@tauri-apps/plugin-global-shortcut').then(({ unregister }) => {
          unregister(SHORTCUTS.playPause).catch(() => {});
          unregister(SHORTCUTS.stop).catch(() => {});
        });
      }
    };
  }, [inTauri, globalShortcutsEnabled]);

  // Desktop notifications (only in Tauri) — triggered on COMPLETED status
  useEffect(() => {
    if (!inTauri) return;
    if (status !== 'COMPLETED') return;

    const sendCompletionNotification = async () => {
      try {
        const subject = useTimerStore.getState().subject;
        const { notificationEnabled } = useSettingsStore.getState();
        if (!notificationEnabled) return;

        const { isPermissionGranted, requestPermission, sendNotification } =
          await import('@tauri-apps/plugin-notification');

        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === 'granted';
        }
        if (granted) {
          sendNotification({
            title: '学习计时完成！',
            body: `科目：${subject} — 专注时光已结束，休息一下吧 🌿`,
          });
        }
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    };

    sendCompletionNotification();
  }, [status, inTauri]);

  // Drive timer display updates with minimal interval
  useEffect(() => {
    if (status !== 'RUNNING') return;

    const interval = setInterval(() => {
      setTick((n) => n + 1);

      const { startedAt, cumulativePausedDuration, pausedAt, targetDuration } =
        useTimerStore.getState();
      if (!startedAt) return;
      const now = Date.now();
      const effectiveEnd = pausedAt ?? now;
      const elapsed = effectiveEnd - startedAt - cumulativePausedDuration;
      if (elapsed >= targetDuration) {
        useTimerStore.getState().complete();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [status]);

  // Load data on mount
  useEffect(() => {
    if (!loaded) {
      loadFromStorage();
    }
    useTimerStore.getState().restoreFromPersisted();
  }, [loaded, loadFromStorage]);

  // 窗口关闭时保存计时状态（Tauri 环境）
  useEffect(() => {
    if (!inTauri) return;

    const setupCloseHandler = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();

      const unlisten = await appWindow.onCloseRequested(async (event) => {
        const { status, startedAt, pausedAt, cumulativePausedDuration, subject, targetDuration } =
          useTimerStore.getState();

        if ((status === 'RUNNING' || status === 'PAUSED') && startedAt) {
          event.preventDefault();

          const effectiveEnd = status === 'PAUSED' && pausedAt ? pausedAt : Date.now();
          const elapsed = effectiveEnd - startedAt - cumulativePausedDuration;

          if (elapsed > 0) {
            useStatsStore.getState().addSession({
              subject,
              startedAt,
              endedAt: effectiveEnd,
              duration: elapsed,
              targetDuration,
            });
          }

          useTimerStore.setState({
            status: 'IDLE',
            startedAt: null,
            pausedAt: null,
            cumulativePausedDuration: 0,
          });

          appWindow.close();
        }
      });

      return unlisten;
    };

    const cleanup = setupCloseHandler();
    return () => {
      cleanup.then((unlisten) => unlisten?.());
    };
  }, [inTauri]);

  // Apply always on top (only in Tauri)
  useEffect(() => {
    if (!inTauri) return;
    const applyAlwaysOnTop = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      appWindow.setAlwaysOnTop(alwaysOnTop).catch(console.error);
    };
    applyAlwaysOnTop();
  }, [alwaysOnTop, inTauri]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const containerClass = `app-container ${status === 'RUNNING' ? 'app-running' : ''} ${status === 'PAUSED' ? 'app-paused' : ''} ${status === 'COMPLETED' ? 'app-completed' : ''}`;

  return (
    <div className={containerClass} onContextMenu={handleContextMenu}>
      <TitleBar 
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="main-content">
        <div className="timer-section">
          <TimerRing progress={progress} status={status} elapsed={elapsed} />
        </div>

        <Controls />
        <TodayStats />
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 6: 验证构建**

```bash
npm run typecheck
npm run dev
```

预期：无错误，应用运行正常。

- [ ] **Step 7: 提交**

```bash
git add src/App.tsx
git commit -m "feat: integrate TodayStats, ContextMenu, HistoryModal into main UI"
```

---

## Task 9: 测试与验证

**Files:**
- 无

- [ ] **Step 1: 功能测试**

在浏览器和 Tauri 环境中测试：

1. **主界面**
   - [ ] TimerRing 正常显示，时间在圆环内
   - [ ] Controls 按钮正常工作（开始/暂停/停止）
   - [ ] TodayStats 显示今日专注时长
   - [ ] 无 SubjectInput、DurationSelector、StatsCard、HistoryPanel

2. **TitleBar**
   - [ ] 点击科目可编辑
   - [ ] Enter 确认，Escape 取消
   - [ ] 下拉箭头显示最近科目列表
   - [ ] 计时中禁止编辑
   - [ ] 置顶按钮正常
   - [ ] 设置按钮打开 SettingsPanel
   - [ ] 历史按钮打开 HistoryModal

3. **右键菜单**
   - [ ] 右键任意位置弹出菜单
   - [ ] 点击外部关闭
   - [ ] ESC 关闭
   - [ ] 菜单项正常工作

4. **HistoryModal**
   - [ ] 全屏显示
   - [ ] 顶部显示今日专注和连续天数
   - [ ] 历史记录按日期分组
   - [ ] 可删除单条记录
   - [ ] 可清空所有记录
   - [ ] 可导出 JSON

5. **SettingsPanel**
   - [ ] 目标时长选择正常
   - [ ] 无紧凑模式选项
   - [ ] 窗口置顶正常
   - [ ] 通知和快捷键设置正常

- [ ] **Step 2: 类型检查**

```bash
npm run typecheck
```

预期：无错误。

- [ ] **Step 3: 格式检查**

```bash
npm run format:check
```

预期：无错误。

- [ ] **Step 4: 最终构建**

```bash
npm run tauri:build
```

预期：构建成功，生成安装包。

- [ ] **Step 5: 提交测试验证**

```bash
git add -A
git commit -m "test: verify all UI redesign features work correctly"
```

---

## Task 10: 清理未使用的组件文件

**Files:**
- 无（保留文件供未来参考）

根据设计文档，以下文件保留但不在主界面使用：
- `src/components/SubjectInput.tsx` — 功能已移入 TitleBar
- `src/components/DurationSelector.tsx` — 仅通过 SettingsPanel 访问
- `src/components/StatsCard.tsx` — 统计已移入 HistoryModal
- `src/components/HistoryPanel.tsx` — 逻辑已移植到 HistoryModal

这些文件暂时保留，不影响构建。

- [ ] **Step 1: 确认文件存在但不影响构建**

```bash
ls src/components/SubjectInput.tsx src/components/DurationSelector.tsx src/components/StatsCard.tsx src/components/HistoryPanel.tsx
npm run typecheck
```

预期：文件存在，无 TypeScript 错误。

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "chore: keep unused components for reference"
```

---

## 执行选项

计划完成并保存到 `docs/superpowers/plans/2026-07-14-main-ui-redesign.md`。

**两种执行方式：**

**1. Subagent-Driven（推荐）** — 每个任务派发独立子代理，任务间可审查，快速迭代

**2. Inline Execution** — 在当前会话中批量执行，设置检查点审查

选择哪种方式？

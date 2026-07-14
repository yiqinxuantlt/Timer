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
import CompactTimer from './components/CompactTimer';
import { isTauri } from './lib/platform';

function App() {
  const { status } = useTimerStore();
  const elapsed = useElapsed();
  const progress = useProgress();
  const { loaded, loadFromStorage } = useStatsStore();
  const { alwaysOnTop, globalShortcutsEnabled, compactMode } = useSettingsStore();
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

        // Ctrl+Alt+Space: 开始或暂停
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

        // Ctrl+Alt+S: 停止
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
  // Also detect when target duration is reached → auto-complete
  useEffect(() => {
    if (status !== 'RUNNING') return;

    const interval = setInterval(() => {
      setTick((n) => n + 1);

      // Auto-complete when elapsed reaches target duration
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
    // 恢复计时状态并检查有效性
    useTimerStore.getState().restoreFromPersisted();
  }, [loaded, loadFromStorage]);

  // 窗口关闭时保存计时状态（Tauri 环境）
  // 使用 ref 避免重复注册监听器
  useEffect(() => {
    if (!inTauri) return;

    let unlistenFn: (() => void) | null = null;

    const setupCloseHandler = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();

      unlistenFn = await appWindow.onCloseRequested(async (event) => {
        const { status, startedAt, pausedAt, cumulativePausedDuration, subject, targetDuration } =
          useTimerStore.getState();

        // 如果有正在进行的计时，阻止关闭并保存
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

          // 允许关闭
          appWindow.close();
        }
      });
    };

    setupCloseHandler();

    return () => {
      unlistenFn?.();
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

  // Resize window when compact mode toggles (only in Tauri)
  useEffect(() => {
    if (!inTauri) return;
    const resizeWindow = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (compactMode) {
        await appWindow.setSize(new LogicalSize(220, 140));
        await appWindow.setMinSize(new LogicalSize(220, 140));
      } else {
        await appWindow.setSize(new LogicalSize(320, 420));
        await appWindow.setMinSize(new LogicalSize(320, 280));
      }
    };
    resizeWindow();
  }, [compactMode, inTauri]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const containerClass = `app-container ${status === 'RUNNING' ? 'app-running' : ''} ${status === 'PAUSED' ? 'app-paused' : ''} ${status === 'COMPLETED' ? 'app-completed' : ''}`;

  return compactMode ? (
    <CompactTimer />
  ) : (
    <div className={containerClass} onContextMenu={handleContextMenu}>
      <TitleBar onOpenSettings={() => setSettingsOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />

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
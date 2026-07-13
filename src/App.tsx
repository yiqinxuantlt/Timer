import { useState, useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTimerStore, useElapsed, useProgress } from './stores/timerStore';
import { useStatsStore } from './stores/statsStore';
import TitleBar from './components/TitleBar';
import TimerRing from './components/TimerRing';
import TimerDisplay from './components/TimerDisplay';
import SubjectInput from './components/SubjectInput';
import DurationSelector from './components/DurationSelector';
import Controls from './components/Controls';
import StatsCard from './components/StatsCard';
import HistoryPanel from './components/HistoryPanel';
import CompactTimer from './components/CompactTimer';

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

function App() {
  const { status } = useTimerStore();
  const elapsed = useElapsed();
  const progress = useProgress();
  const { loaded, loadFromStorage } = useStatsStore();
  const { compactMode, alwaysOnTop } = useSettingsStore();
  const [, setTick] = useState(0);

  // Keyboard shortcuts (only in Tauri)
  useEffect(() => {
    if (!isTauri) return;
    let mounted = true;
    const registerShortcuts = async () => {
      const { register } = await import('@tauri-apps/plugin-global-shortcut');
      const { start, pause, resume, stop } = useTimerStore.getState();
      
      await register('Space', () => {
        if (!mounted) return;
        const currentStatus = useTimerStore.getState().status;
        if (currentStatus === 'IDLE' || currentStatus === 'COMPLETED') {
          start();
        } else if (currentStatus === 'RUNNING') {
          pause();
        } else if (currentStatus === 'PAUSED') {
          resume();
        }
      });
      
      await register('Escape', () => {
        if (!mounted) return;
        const currentStatus = useTimerStore.getState().status;
        if (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') {
          stop(true);
        }
      });
    };
    registerShortcuts().catch(console.error);
    
    return () => {
      mounted = false;
      if (isTauri) {
        import('@tauri-apps/plugin-global-shortcut').then(({ unregister }) => {
          unregister('Space').catch(() => {});
          unregister('Escape').catch(() => {});
        });
      }
    };
  }, []);

  // Desktop notifications (only in Tauri) — triggered on COMPLETED status
  useEffect(() => {
    if (!isTauri) return;
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
  }, [status]);

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
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  // Load data on mount
  useEffect(() => {
    if (!loaded) {
      loadFromStorage();
    }
  }, [loaded, loadFromStorage]);

  // Apply compact mode window resize (only in Tauri)
  useEffect(() => {
    if (!isTauri) return;
    const applyWindowSize = async () => {
      const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      if (compactMode) {
        appWindow.setSize(new LogicalSize(160, 200)).catch(console.error);
      } else {
        appWindow.setSize(new LogicalSize(320, 420)).catch(console.error);
      }
    };
    applyWindowSize();
  }, [compactMode]);

  // Apply always on top (only in Tauri)
  useEffect(() => {
    if (!isTauri) return;
    const applyAlwaysOnTop = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      appWindow.setAlwaysOnTop(alwaysOnTop).catch(console.error);
    };
    applyAlwaysOnTop();
  }, [alwaysOnTop]);

  const containerClass = `app-container ${status === 'RUNNING' ? 'app-running' : ''} ${status === 'PAUSED' ? 'app-paused' : ''} ${status === 'COMPLETED' ? 'app-completed' : ''}`;

  if (compactMode) {
    return (
      <div className={containerClass}>
        <CompactTimer />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <TitleBar />

      <div className="main-content">
        <div className="timer-section">
          <TimerRing progress={progress} status={status} />
          <TimerDisplay elapsed={elapsed} status={status} />
        </div>

        <SubjectInput />
        <DurationSelector />
        <Controls />
        <StatsCard />
        <HistoryPanel />
      </div>
    </div>
  );
}

export default App;
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTimer } from './hooks/useTimer';
import { useWindowManagement } from './hooks/useWindowManagement';
import { notifyCompletion } from './services/notificationService';
import { useSettingsStore } from './stores/settingsStore';
import { useStatsStore } from './stores/statsStore';
import { useTimerStore } from './stores/timerStore';
import TitleBar from './components/TitleBar';
import TimerRing from './components/TimerRing';
import Controls from './components/Controls';
import TodayStats from './components/TodayStats';
import ContextMenu from './components/ContextMenu';
import HistoryModal from './components/HistoryModal';
import SettingsPanel from './components/SettingsPanel';
import CompactTimer from './components/CompactTimer';
import ModeSwitcher from './components/ModeSwitcher';
import PhaseCard from './components/PhaseCard';

function App() {
  const { elapsed, progress, status } = useTimer();
  const complete = useTimerStore((state) => state.complete);
  const mode = useTimerStore((state) => state.mode);
  const pomodoroPhase = useTimerStore((state) => state.pomodoroPhase);
  const targetDuration = useTimerStore((state) => state.targetDuration);
  const subject = useTimerStore((state) => state.subject);
  const defaultTargetDuration = useSettingsStore((state) => state.defaultTargetDuration);
  const pomodoroConfig = useSettingsStore((state) => state.pomodoroConfig);
  const notificationEnabled = useSettingsStore((state) => state.notificationEnabled);
  const compactMode = useSettingsStore((state) => state.compactMode);
  const loaded = useStatsStore((state) => state.loaded);
  const storageWarning = useStatsStore((state) => state.storageWarning);
  const loadFromStorage = useStatsStore((state) => state.loadFromStorage);
  const inTauri = useWindowManagement();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useKeyboardShortcuts(inTauri);

  useEffect(() => {
    if (!loaded) void loadFromStorage();
    useTimerStore.getState().restoreFromPersisted();
  }, [loadFromStorage, loaded]);

  useEffect(() => {
    if (mode === 'focus' && (status === 'IDLE' || status === 'COMPLETED')) {
      useTimerStore.getState().setTargetDuration(defaultTargetDuration);
    }
  }, [defaultTargetDuration, mode, status]);

  useEffect(() => {
    if (mode === 'pomodoro' && status === 'IDLE') {
      useTimerStore.getState().setTargetDuration(pomodoroConfig.focusDuration);
    }
  }, [mode, pomodoroConfig.focusDuration, status]);

  useEffect(() => {
    if (status === 'RUNNING' && targetDuration > 0 && elapsed >= targetDuration) {
      void complete();
    }
  }, [complete, elapsed, status, targetDuration]);

  useEffect(() => {
    if (!inTauri || status !== 'COMPLETED' || !notificationEnabled) return;
    void notifyCompletion(subject, mode === 'pomodoro' ? pomodoroPhase : null);
  }, [inTauri, mode, notificationEnabled, pomodoroPhase, status, subject]);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const containerClass = [
    'app-container',
    status === 'RUNNING' ? 'app-running' : '',
    status === 'PAUSED' ? 'app-paused' : '',
    status === 'COMPLETED' ? 'app-completed' : ''
  ]
    .filter(Boolean)
    .join(' ');

  if (compactMode) return <CompactTimer inTauri={inTauri} />;

  return (
    <div className={containerClass} onContextMenu={handleContextMenu}>
      <TitleBar inTauri={inTauri} onOpenSettings={openSettings} onOpenHistory={openHistory} />

      {storageWarning && (
        <p className="storage-warning" role="status" aria-live="polite">
          {storageWarning}
        </p>
      )}

      <main className="main-content">
        <div className="mode-switcher-slot">
          <ModeSwitcher />
        </div>
        <section className="timer-section" aria-label="计时器">
          <div className="timer-stage">
            <TimerRing progress={progress} status={status} elapsed={elapsed} />
            <PhaseCard />
          </div>
        </section>

        <Controls />
        <TodayStats />
      </main>

      <SettingsPanel inTauri={inTauri} isOpen={settingsOpen} onClose={closeSettings} />
      <HistoryModal isOpen={historyOpen} onClose={closeHistory} />

      {contextMenu && (
        <ContextMenu
          inTauri={inTauri}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpenHistory={openHistory}
          onOpenSettings={openSettings}
        />
      )}
    </div>
  );
}

export default App;

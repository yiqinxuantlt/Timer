import { useEffect, useState, type MouseEvent } from 'react';
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

function App() {
  const { elapsed, progress, status } = useTimer();
  const complete = useTimerStore((state) => state.complete);
  const targetDuration = useTimerStore((state) => state.targetDuration);
  const subject = useTimerStore((state) => state.subject);
  const defaultTargetDuration = useSettingsStore((state) => state.defaultTargetDuration);
  const notificationEnabled = useSettingsStore((state) => state.notificationEnabled);
  const compactMode = useSettingsStore((state) => state.compactMode);
  const loaded = useStatsStore((state) => state.loaded);
  const loadFromStorage = useStatsStore((state) => state.loadFromStorage);
  const inTauri = useWindowManagement();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useKeyboardShortcuts(inTauri);

  useEffect(() => {
    if (!loaded) void loadFromStorage();
    useTimerStore.getState().restoreFromPersisted();
  }, [loadFromStorage, loaded]);

  useEffect(() => {
    if (status === 'IDLE' || status === 'COMPLETED') {
      useTimerStore.getState().setTargetDuration(defaultTargetDuration);
    }
  }, [defaultTargetDuration, status]);

  useEffect(() => {
    if (status === 'RUNNING' && targetDuration > 0 && elapsed >= targetDuration) {
      void complete();
    }
  }, [complete, elapsed, status, targetDuration]);

  useEffect(() => {
    if (!inTauri || status !== 'COMPLETED' || !notificationEnabled) return;
    void notifyCompletion(subject);
  }, [inTauri, notificationEnabled, status, subject]);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);
  const containerClass = [
    'app-container',
    status === 'RUNNING' ? 'app-running' : '',
    status === 'PAUSED' ? 'app-paused' : '',
    status === 'COMPLETED' ? 'app-completed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (compactMode) return <CompactTimer />;

  return (
    <div className={containerClass} onContextMenu={handleContextMenu}>
      <TitleBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <main className="main-content">
        <section className="timer-section" aria-label="计时器">
          <TimerRing progress={progress} status={status} elapsed={elapsed} />
        </section>

        <Controls />
        <TodayStats />
      </main>

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

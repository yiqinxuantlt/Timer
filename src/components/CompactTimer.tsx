import { memo, useEffect, useState } from 'react';
import { Minus, X, Maximize2 } from 'lucide-react';
import { isTauri } from '../lib/platform';
import { useTimerStore, useTimerUpdater, formatElapsed } from '../stores/timerStore';
import { useSettingsStore } from '../stores/settingsStore';
import TimerRing from './TimerRing';
import Controls from './Controls';
import styles from './CompactTimer.module.css';

const STATUS_LABELS: Record<string, string> = {
  IDLE: '准备开始',
  RUNNING: '专注中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
};

function CompactTimer() {
  const status = useTimerStore((s) => s.status);
  const elapsed = useTimerUpdater(); // 使用 rAF 驱动的更新
  const { toggleCompactMode } = useSettingsStore();
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

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

  const handleRestore = () => {
    toggleCompactMode();
  };

  const labelClass =
    status === 'RUNNING' ? styles.statusLabelRunning
    : status === 'PAUSED' ? styles.statusLabelPaused
    : status === 'COMPLETED' ? styles.statusLabelCompleted
    : '';

  const progress = useTimerStore((s) => {
    const { startedAt, targetDuration, cumulativePausedDuration } = s;
    if (!startedAt || targetDuration <= 0) return 0;
    const elapsed = Date.now() - startedAt - cumulativePausedDuration;
    return Math.min(elapsed / targetDuration, 1);
  });

  return (
    <div className={styles.container}>
      {/* Mini title bar */}
      <div className={styles.miniTitleBar}>
        <div className={styles.dragRegion} data-tauri-drag-region />
        <div className={styles.titleButtons}>
          <button
            className={styles.titleButton}
            onClick={handleRestore}
            aria-label="恢复普通模式"
            title="恢复普通模式"
          >
            <Maximize2 size={10} />
          </button>
          <button
            className={styles.titleButton}
            onClick={handleMinimize}
            aria-label="最小化"
          >
            <Minus size={10} />
          </button>
          <button
            className={`${styles.titleButton} ${styles.close}`}
            onClick={handleClose}
            aria-label="关闭"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Main content - horizontal layout */}
      <div className={styles.mainContent}>
        <div className={styles.ringSection}>
          <TimerRing progress={progress} status={status} elapsed={elapsed} size="mini" />
        </div>
        <div className={styles.infoSection}>
          <span className={styles.timeDisplay}>
            {formatElapsed(elapsed)}
          </span>
          <span className={`${styles.statusLabel} ${labelClass}`}>
            {STATUS_LABELS[status]}
          </span>
          <Controls size="compact" />
        </div>
      </div>
    </div>
  );
}

export default memo(CompactTimer);
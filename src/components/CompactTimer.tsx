import { memo, useEffect, useState } from 'react';
import { Maximize2, Minus, X } from 'lucide-react';
import { isTauri } from '../lib/platform';
import { useTimer } from '../hooks/useTimer';
import { closeWindow, minimizeWindow } from '../services/windowService';
import { useSettingsStore } from '../stores/settingsStore';
import { formatElapsed } from '../utils/format';
import TimerRing from './TimerRing';
import Controls from './Controls';
import styles from './CompactTimer.module.css';

const STATUS_LABELS = {
  IDLE: '准备开始',
  RUNNING: '专注中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  CANCELLED: '已停止',
} as const;

function CompactTimer() {
  const { elapsed, progress, status } = useTimer();
  const toggleCompactMode = useSettingsStore((state) => state.toggleCompactMode);
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    void isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  const handleMinimize = async () => {
    if (!inTauri) return;
    await minimizeWindow();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    await closeWindow();
  };

  const labelClass =
    status === 'RUNNING'
      ? styles.statusLabelRunning
      : status === 'PAUSED'
        ? styles.statusLabelPaused
        : status === 'COMPLETED'
          ? styles.statusLabelCompleted
          : '';

  return (
    <div className={styles.container}>
      <div className={styles.miniTitleBar}>
        <div className={styles.dragRegion} data-tauri-drag-region />
        <div className={styles.titleButtons}>
          <button className={styles.titleButton} onClick={toggleCompactMode} aria-label="恢复普通模式">
            <Maximize2 size={10} />
          </button>
          <button className={styles.titleButton} onClick={handleMinimize} aria-label="最小化">
            <Minus size={10} />
          </button>
          <button className={`${styles.titleButton} ${styles.close}`} onClick={handleClose} aria-label="关闭">
            <X size={10} />
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.ringSection}>
          <TimerRing progress={progress} status={status} size="mini" elapsed={elapsed} />
        </div>
        <div className={styles.infoSection}>
          <span className={styles.timeDisplay}>{formatElapsed(elapsed)}</span>
          <span className={`${styles.statusLabel} ${labelClass}`}>{STATUS_LABELS[status]}</span>
          <Controls size="compact" />
        </div>
      </div>
    </div>
  );
}

export default memo(CompactTimer);

import { memo, useEffect, useState } from 'react';
import { Minus, X, Maximize2 } from 'lucide-react';
import TimerRing from './TimerRing';
import TimerDisplay from './TimerDisplay';
import Controls from './Controls';
import styles from './CompactTimer.module.css';
import { useElapsed, useProgress, useTimerStatus } from '../stores/timerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { isTauri } from '../lib/platform';
import type { TimerStatus } from '../types';

function CompactTimer() {
  const elapsed = useElapsed();
  const progress = useProgress();
  const status = useTimerStatus() as TimerStatus;
  const toggleCompactMode = useSettingsStore((s) => s.toggleCompactMode);
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  const handleMinimize = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  };

  const handleRestore = () => {
    toggleCompactMode();
  };

  return (
    <div className={styles.wrapper}>
      {/* Mini title bar */}
      <div className={styles.titleBar} data-tauri-drag-region>
        <span className={styles.titleLabel} data-tauri-drag-region>
          focus
        </span>
        <div className={styles.titleControls}>
          <button
            className={styles.titleButton}
            onClick={handleRestore}
            aria-label="恢复普通模式"
            title="恢复普通模式"
          >
            <Maximize2 size={10} />
          </button>
          {inTauri && (
            <>
              <button
                className={styles.titleButton}
                onClick={handleMinimize}
                aria-label="最小化"
              >
                <Minus size={10} />
              </button>
              <button
                className={`${styles.titleButton} ${styles.titleButtonClose}`}
                onClick={handleClose}
                aria-label="关闭"
              >
                <X size={10} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Horizontal layout: ring + display + controls */}
      <div className={styles.body}>
        <div className={styles.ringSection}>
          <TimerRing progress={progress} size="mini" status={status} />
        </div>
        <div className={styles.content}>
          <TimerDisplay elapsed={elapsed} status={status} size="mini" />
          <Controls size="compact" />
        </div>
      </div>
    </div>
  );
}

export default memo(CompactTimer);
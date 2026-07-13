import { memo } from 'react';
import TimerRing from './TimerRing';
import TimerDisplay from './TimerDisplay';
import Controls from './Controls';
import styles from './CompactTimer.module.css';
import { useElapsed, useProgress, useTimerStatus } from '../stores/timerStore';
import type { TimerStatus } from '../types';

function CompactTimer() {
  const elapsed = useElapsed();
  const progress = useProgress();
  const status = useTimerStatus() as TimerStatus;

  return (
    <div className={styles.container}>
      <div className={styles.ringSection}>
        <TimerRing progress={progress} size="compact" status={status} />
      </div>
      <div className={styles.content}>
        <TimerDisplay elapsed={elapsed} status={status} size="compact" />
        <Controls />
      </div>
    </div>
  );
}

export default memo(CompactTimer);
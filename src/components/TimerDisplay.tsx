import { memo } from 'react';
import { formatElapsed } from '../stores/timerStore';
import type { TimerStatus } from '../types';
import styles from './TimerDisplay.module.css';

interface TimerDisplayProps {
  elapsed: number;
  status: TimerStatus;
  size?: 'normal' | 'compact';
}

const STATUS_LABELS: Record<TimerStatus, string> = {
  IDLE: 'ready',
  RUNNING: 'focusing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

const LABEL_CLASSES: Record<TimerStatus, string> = {
  IDLE: styles.labelIdle,
  RUNNING: styles.labelRunning,
  PAUSED: styles.labelPaused,
  COMPLETED: styles.labelCompleted,
};

function TimerDisplay({ elapsed, status, size = 'normal' }: TimerDisplayProps) {
  return (
    <div className={styles.container}>
      <span className={`${styles.time} ${size === 'compact' ? styles.timeCompact : ''}`}>
        {formatElapsed(elapsed)}
      </span>
      <span className={`${styles.label} ${LABEL_CLASSES[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

export default memo(TimerDisplay);
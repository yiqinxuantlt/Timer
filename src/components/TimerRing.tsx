import { memo, useId } from 'react';
import type { TimerStatus } from '../types';
import { formatElapsed } from '../utils/format';
import styles from './TimerRing.module.css';

interface TimerRingProps {
  progress: number;
  size?: 'normal' | 'compact' | 'mini';
  status?: TimerStatus;
  elapsed?: number;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_LABELS: Record<TimerStatus, string> = {
  IDLE: '准备开始',
  RUNNING: '专注中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  CANCELLED: '已停止'
};

function TimerRing({ progress, size = 'normal', status = 'IDLE', elapsed = 0 }: TimerRingProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `progressGradient${id}`;
  const activeGradientId = `progressGradientActive${id}`;
  const pausedGradientId = `progressGradientPaused${id}`;
  const completedGradientId = `progressGradientCompleted${id}`;
  const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));
  const containerClass =
    size === 'compact'
      ? styles.containerCompact
      : size === 'mini'
        ? styles.containerMini
        : styles.container;
  const progressClass = `${styles.progressCircle} ${
    status === 'COMPLETED'
      ? styles.progressCircleCompleted
      : status === 'RUNNING'
        ? styles.progressCircleRunning
        : ''
  }`;
  const svgSize = size === 'mini' ? 64 : size === 'compact' ? 80 : 160;
  const progressStroke =
    status === 'COMPLETED'
      ? `url(#${completedGradientId})`
      : status === 'PAUSED'
        ? `url(#${pausedGradientId})`
        : status === 'RUNNING'
          ? `url(#${activeGradientId})`
          : `url(#${gradientId})`;

  return (
    <div
      className={containerClass}
      data-size={size}
      data-status={status}
      data-testid="timer-ring"
    >
      <svg className={styles.svg} width={svgSize} height={svgSize} viewBox="0 0 160 160">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id={activeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={pausedGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id={completedGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle className={styles.bgCircle} cx="80" cy="80" r={RADIUS} />
        <circle
          className={progressClass}
          cx="80"
          cy="80"
          data-testid="timer-progress"
          r={RADIUS}
          style={{
            stroke: progressStroke,
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: offset
          }}
        />
      </svg>

      {size === 'normal' && (
        <div className={styles.innerContent}>
          <span className={styles.innerTime}>{formatElapsed(elapsed)}</span>
          <span
            className={`${styles.innerLabel} ${
              styles[`innerLabel${status.charAt(0)}${status.slice(1).toLowerCase()}`]
            }`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(TimerRing);

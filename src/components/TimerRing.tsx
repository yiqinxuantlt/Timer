import { memo } from 'react';
import styles from './TimerRing.module.css';
import type { TimerStatus } from '../types';

interface TimerRingProps {
  progress: number;
  size?: 'normal' | 'compact' | 'mini';
  status?: TimerStatus;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function TimerRing({ progress, size = 'normal', status = 'IDLE' }: TimerRingProps) {
  const offset = CIRCUMFERENCE * (1 - progress);

  const containerClass =
    size === 'compact' ? styles.containerCompact
    : size === 'mini' ? styles.containerMini
    : styles.container;

  const progressClass = status === 'COMPLETED'
    ? styles.progressCircleCompleted
    : status === 'RUNNING'
    ? styles.progressCircleRunning
    : styles.progressCircle;

  const svgSize = size === 'mini' ? 64 : size === 'compact' ? 80 : 160;

  return (
    <div className={containerClass}>
      <svg
        className={styles.svg}
        width={svgSize}
        height={svgSize}
        viewBox="0 0 160 160"
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="progressGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="progressGradientCompleted" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          className={styles.bgCircle}
          cx="80"
          cy="80"
          r={RADIUS}
        />
        <circle
          className={progressClass}
          cx="80"
          cy="80"
          r={RADIUS}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: offset,
          }}
        />
      </svg>
    </div>
  );
}

export default memo(TimerRing);
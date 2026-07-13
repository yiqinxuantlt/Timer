import { memo } from 'react';
import styles from './TimerRing.module.css';
import type { TimerStatus } from '../types';
import { formatElapsed } from '../stores/timerStore';

interface TimerRingProps {
  progress: number;
  size?: 'normal' | 'compact' | 'mini';
  status?: TimerStatus;
  elapsed?: number; // 新增：用于在圆环内显示时间
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_LABELS: Record<TimerStatus, string> = {
  IDLE: '准备开始',
  RUNNING: '专注中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
};

function TimerRing({ progress, size = 'normal', status = 'IDLE', elapsed = 0 }: TimerRingProps) {
  const offset = CIRCUMFERENCE * (1 - progress);

  const containerClass =
    size === 'compact' ? styles.containerCompact
    : size === 'mini' ? styles.containerMini
    : styles.container;

  // 状态 class 组合：基础样式 + 状态覆盖
  const progressClass = `${styles.progressCircle} ${
    status === 'COMPLETED' ? styles.progressCircleCompleted
    : status === 'RUNNING' ? styles.progressCircleRunning
    : ''
  }`;

  const svgSize = size === 'mini' ? 64 : size === 'compact' ? 80 : 160;

  // 仅在 normal 模式下显示圆环内文字
  const showInnerContent = size === 'normal';

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

      {/* 圆环内部内容：时间 + 状态标签 */}
      {showInnerContent && (
        <div className={styles.innerContent}>
          <span className={styles.innerTime}>
            {formatElapsed(elapsed)}
          </span>
          <span className={`${styles.innerLabel} ${styles[`innerLabel${status.charAt(0)}${status.slice(1).toLowerCase()}`]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(TimerRing);
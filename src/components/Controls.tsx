import { memo } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import styles from './Controls.module.css';

interface ControlsProps {
  size?: 'normal' | 'compact';
}

function Controls({ size = 'normal' }: ControlsProps) {
  const { status, start, pause, resume, stop } = useTimerStore();

  const handleStart = () => {
    if (status === 'IDLE' || status === 'COMPLETED') {
      start();
    } else if (status === 'PAUSED') {
      resume();
    }
  };

  const handlePause = () => {
    if (status === 'RUNNING') {
      pause();
    }
  };

  const handleStop = () => {
    if (status === 'RUNNING' || status === 'PAUSED') {
      stop(true);
    }
  };

  const isIdle = status === 'IDLE' || status === 'COMPLETED';
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const isActive = isRunning || isPaused;

  const containerClass = size === 'compact' ? styles.containerCompact : styles.container;
  const buttonIconSize = size === 'compact' ? 14 : 18;

  return (
    <div className={containerClass}>
      <button
        className={`${styles.button} ${styles.buttonStart} ${isRunning ? styles.buttonStartActive : ''} ${size === 'compact' ? styles.buttonStartCompact : ''}`}
        onClick={handleStart}
        disabled={isRunning}
        aria-label={isIdle ? '开始' : isPaused ? '继续' : '开始'}
      >
        <Play size={buttonIconSize} fill="currentColor" />
      </button>

      <button
        className={`${styles.button} ${styles.buttonPause} ${size === 'compact' ? styles.buttonCompact : ''}`}
        onClick={handlePause}
        disabled={!isRunning}
        aria-label="暂停"
      >
        <Pause size={buttonIconSize} fill="currentColor" />
      </button>

      <button
        className={`${styles.button} ${styles.buttonStop} ${size === 'compact' ? styles.buttonCompact : ''}`}
        onClick={handleStop}
        disabled={!isActive}
        aria-label="停止"
      >
        <Square size={buttonIconSize} fill="currentColor" />
      </button>
    </div>
  );
}

export default memo(Controls);
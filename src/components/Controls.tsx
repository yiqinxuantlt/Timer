import { memo } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import styles from './Controls.module.css';

function Controls() {
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

  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${styles.buttonStart} ${isRunning ? styles.buttonStartActive : ''}`}
        onClick={handleStart}
        disabled={isRunning}
        aria-label={isIdle ? '开始' : isPaused ? '继续' : '开始'}
      >
        <Play size={18} fill="currentColor" />
      </button>

      <button
        className={`${styles.button} ${styles.buttonPause}`}
        onClick={handlePause}
        disabled={!isRunning}
        aria-label="暂停"
      >
        <Pause size={18} fill="currentColor" />
      </button>

      <button
        className={`${styles.button} ${styles.buttonStop}`}
        onClick={handleStop}
        disabled={!isActive}
        aria-label="停止"
      >
        <Square size={18} fill="currentColor" />
      </button>
    </div>
  );
}

export default memo(Controls);
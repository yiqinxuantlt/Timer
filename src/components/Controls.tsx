import { memo } from 'react';
import { Check, Play, Pause, Square } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import styles from './Controls.module.css';

interface ControlsProps {
  size?: 'normal' | 'compact';
}

function Controls({ size = 'normal' }: ControlsProps) {
  const status = useTimerStore((state) => state.status);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const stop = useTimerStore((state) => state.stop);
  const confirmPomodoroPhase = useTimerStore((state) => state.confirmPomodoroPhase);
  const pomodoroWaitingForConfirmation = useTimerStore(
    (state) => state.pomodoroWaitingForConfirmation
  );

  const handleStart = () => {
    if (pomodoroWaitingForConfirmation) {
      confirmPomodoroPhase();
      return;
    }

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
    if (status === 'RUNNING' || status === 'PAUSED' || pomodoroWaitingForConfirmation) {
      void stop(true);
    }
  };

  const isIdle = (status === 'IDLE' || status === 'COMPLETED') && !pomodoroWaitingForConfirmation;
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const isActive = isRunning || isPaused || pomodoroWaitingForConfirmation;

  const containerClass = size === 'compact' ? styles.containerCompact : styles.container;
  const buttonIconSize = size === 'compact' ? 14 : 18;

  return (
    <div className={containerClass}>
      <button
        className={`${styles.button} ${styles.buttonStart} ${isRunning ? styles.buttonStartActive : ''} ${size === 'compact' ? styles.buttonStartCompact : ''}`}
        onClick={handleStart}
        disabled={isRunning}
        aria-label={
          pomodoroWaitingForConfirmation
            ? '确认并继续'
            : isIdle
              ? '开始'
              : isPaused
                ? '继续'
                : '开始'
        }
      >
        {pomodoroWaitingForConfirmation ? (
          <Check size={buttonIconSize} />
        ) : (
          <Play size={buttonIconSize} fill="currentColor" />
        )}
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

import { memo } from 'react';
import { Coffee, Timer } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import type { TimerMode } from '../types';
import styles from './ModeSwitcher.module.css';

const MODES: Array<{ value: TimerMode; label: string; icon: typeof Timer }> = [
  { value: 'focus', label: '普通计时', icon: Timer },
  { value: 'pomodoro', label: '番茄钟', icon: Coffee }
];

function ModeSwitcher() {
  const mode = useTimerStore((state) => state.mode);
  const status = useTimerStore((state) => state.status);
  const waitingForConfirmation = useTimerStore((state) => state.pomodoroWaitingForConfirmation);
  const setMode = useTimerStore((state) => state.setMode);
  const disabled = status === 'RUNNING' || status === 'PAUSED' || waitingForConfirmation;

  return (
    <div className={styles.container} role="group" aria-label="计时模式">
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={`${styles.button} ${mode === value ? styles.buttonActive : ''}`}
          onClick={() => setMode(value)}
          disabled={disabled || mode === value}
          aria-pressed={mode === value}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default memo(ModeSwitcher);

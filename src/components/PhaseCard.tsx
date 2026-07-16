import { memo } from 'react';
import { Check, Coffee, Focus, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import type { PomodoroPhase } from '../types';
import styles from './PhaseCard.module.css';

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息'
};

function PhaseIcon({ phase }: { phase: PomodoroPhase }) {
  if (phase === 'focus') return <Focus size={13} />;
  if (phase === 'shortBreak') return <Coffee size={13} />;
  return <Sparkles size={13} />;
}

function PhaseCard() {
  const mode = useTimerStore((state) => state.mode);
  const phase = useTimerStore((state) => state.pomodoroPhase);
  const round = useTimerStore((state) => state.pomodoroRound);
  const status = useTimerStore((state) => state.status);
  const waitingForConfirmation = useTimerStore((state) => state.pomodoroWaitingForConfirmation);
  const confirmPomodoroPhase = useTimerStore((state) => state.confirmPomodoroPhase);
  const cyclesBeforeLongBreak = useSettingsStore(
    (state) => state.pomodoroConfig.cyclesBeforeLongBreak
  );

  if (mode !== 'pomodoro') return null;

  const currentPhase = phase ?? 'focus';
  const phaseLabel = PHASE_LABELS[currentPhase];
  const description = waitingForConfirmation
    ? `${phaseLabel}结束，确认后进入下一阶段`
    : status === 'IDLE'
      ? `准备第 ${round} 轮${phaseLabel}`
      : `第 ${round} / ${cyclesBeforeLongBreak} 轮 · ${phaseLabel}`;

  return (
    <div className={`${styles.card} ${waitingForConfirmation ? styles.cardWaiting : ''}`}>
      <div className={styles.phaseInfo}>
        <span className={styles.phaseIcon} aria-hidden="true">
          <PhaseIcon phase={currentPhase} />
        </span>
        <span className={styles.description}>{description}</span>
      </div>
      {waitingForConfirmation && (
        <button type="button" className={styles.confirmButton} onClick={confirmPomodoroPhase}>
          <Check size={13} />
          确认继续
        </button>
      )}
    </div>
  );
}

export default memo(PhaseCard);

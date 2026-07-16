import type { PomodoroConfig, PomodoroPhase } from '../types';

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusDuration: 25 * 60 * 1000,
  shortBreakDuration: 5 * 60 * 1000,
  longBreakDuration: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4
};

export interface PomodoroPhaseTransition {
  phase: PomodoroPhase;
  round: number;
}

export function getPomodoroPhaseDuration(phase: PomodoroPhase, config: PomodoroConfig): number {
  if (phase === 'shortBreak') return config.shortBreakDuration;
  if (phase === 'longBreak') return config.longBreakDuration;
  return config.focusDuration;
}

export function getNextPomodoroPhase(
  phase: PomodoroPhase,
  round: number,
  cyclesBeforeLongBreak: number
): PomodoroPhaseTransition {
  const cycles = Math.max(1, Math.floor(cyclesBeforeLongBreak));

  if (phase === 'focus') {
    return round % cycles === 0 ? { phase: 'longBreak', round } : { phase: 'shortBreak', round };
  }

  if (phase === 'longBreak') return { phase: 'focus', round: 1 };
  return { phase: 'focus', round: round + 1 };
}

export function normalizePomodoroConfig(value: Partial<PomodoroConfig>): PomodoroConfig {
  const isDuration = (input: unknown, max: number): input is number =>
    typeof input === 'number' && Number.isFinite(input) && input >= 60_000 && input <= max;
  const isCycles = (input: unknown): input is number =>
    typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 12;

  return {
    focusDuration: isDuration(value.focusDuration, 180 * 60_000)
      ? value.focusDuration
      : DEFAULT_POMODORO_CONFIG.focusDuration,
    shortBreakDuration: isDuration(value.shortBreakDuration, 60 * 60_000)
      ? value.shortBreakDuration
      : DEFAULT_POMODORO_CONFIG.shortBreakDuration,
    longBreakDuration: isDuration(value.longBreakDuration, 60 * 60_000)
      ? value.longBreakDuration
      : DEFAULT_POMODORO_CONFIG.longBreakDuration,
    cyclesBeforeLongBreak: isCycles(value.cyclesBeforeLongBreak)
      ? value.cyclesBeforeLongBreak
      : DEFAULT_POMODORO_CONFIG.cyclesBeforeLongBreak
  };
}

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POMODORO_CONFIG,
  getNextPomodoroPhase,
  getPomodoroPhaseDuration,
  normalizePomodoroConfig
} from '../src/utils/pomodoro';

describe('pomodoro utilities', () => {
  it('uses the classic 25/5/15 x4 defaults', () => {
    expect(DEFAULT_POMODORO_CONFIG).toEqual({
      focusDuration: 25 * 60 * 1000,
      shortBreakDuration: 5 * 60 * 1000,
      longBreakDuration: 15 * 60 * 1000,
      cyclesBeforeLongBreak: 4
    });
  });

  it('selects short and long breaks at the correct rounds', () => {
    expect(getNextPomodoroPhase('focus', 3, 4)).toEqual({
      phase: 'shortBreak',
      round: 3
    });
    expect(getNextPomodoroPhase('focus', 4, 4)).toEqual({
      phase: 'longBreak',
      round: 4
    });
    expect(getNextPomodoroPhase('shortBreak', 3, 4)).toEqual({
      phase: 'focus',
      round: 4
    });
    expect(getNextPomodoroPhase('longBreak', 4, 4)).toEqual({
      phase: 'focus',
      round: 1
    });
  });

  it('returns the configured duration for each phase', () => {
    expect(getPomodoroPhaseDuration('focus', DEFAULT_POMODORO_CONFIG)).toBe(25 * 60 * 1000);
    expect(getPomodoroPhaseDuration('shortBreak', DEFAULT_POMODORO_CONFIG)).toBe(5 * 60 * 1000);
    expect(getPomodoroPhaseDuration('longBreak', DEFAULT_POMODORO_CONFIG)).toBe(15 * 60 * 1000);
  });

  it('clamps invalid persisted values back to safe defaults', () => {
    expect(normalizePomodoroConfig({ focusDuration: -1, cyclesBeforeLongBreak: 99 })).toEqual(
      DEFAULT_POMODORO_CONFIG
    );
  });
});

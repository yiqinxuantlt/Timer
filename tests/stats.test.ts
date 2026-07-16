import { describe, expect, it } from 'vitest';
import type { FocusSession } from '../src/types';
import {
  calculateStreak,
  calculateTodayTotal,
  calculateTotalDuration,
  isValidSession
} from '../src/utils/stats';

function timestamp(day: number, hour = 9): number {
  return new Date(2026, 0, day, hour).getTime();
}

function createSession(overrides: Partial<FocusSession> = {}): FocusSession {
  const duration = overrides.duration ?? 60_000;
  const startedAt = overrides.startedAt ?? timestamp(5);

  return {
    id: `session-${startedAt}-${duration}`,
    subject: '数学',
    startedAt,
    endedAt: overrides.endedAt ?? startedAt + duration,
    duration,
    targetDuration: 3_600_000,
    status: 'completed',
    mode: 'focus',
    ...overrides
  };
}

describe('study statistics', () => {
  it('only counts completed sessions that last at least one minute', () => {
    const valid = createSession({ duration: 120_000 });
    const cancelled = createSession({ id: 'cancelled', status: 'cancelled', duration: 300_000 });
    const tooShort = createSession({ id: 'short', duration: 59_999 });
    const invalidRange = createSession({ id: 'range', endedAt: timestamp(5) - 1 });

    expect(isValidSession(valid)).toBe(true);
    expect(isValidSession(cancelled)).toBe(false);
    expect(isValidSession(tooShort)).toBe(false);
    expect(isValidSession(invalidRange)).toBe(false);
    expect(calculateTodayTotal([valid, cancelled, tooShort, invalidRange], timestamp(5, 18))).toBe(
      120_000
    );
    expect(calculateTotalDuration([valid, cancelled, tooShort, invalidRange])).toBe(120_000);
  });

  it('uses the session start date and requires an unbroken streak through today', () => {
    const sessions = [
      createSession({ id: 'today', startedAt: timestamp(5) }),
      createSession({ id: 'yesterday', startedAt: timestamp(4) }),
      createSession({ id: 'two-days-ago', startedAt: timestamp(3) }),
      createSession({ id: 'gap-before', startedAt: timestamp(1) })
    ];

    expect(calculateStreak(sessions, timestamp(5, 20))).toBe(3);
    expect(calculateStreak(sessions.slice(1), timestamp(5, 20))).toBe(0);
  });
});

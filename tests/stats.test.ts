import { describe, expect, it } from 'vitest';
import type { FocusSession, StudyProject } from '../src/types';
import {
  calculateProjectSummaries,
  calculateRecentDailyTotals,
  calculateStreak,
  calculateTodayTotal,
  calculateTotalDuration,
  isValidSession
} from '../src/utils/stats';
import { DEFAULT_PROJECT } from '../src/utils/projects';

const mathProject: StudyProject = {
  id: 'project-math',
  name: '数学复习',
  color: 'cyan',
  createdAt: 0,
  archivedAt: null
};

function timestamp(day: number, hour = 9): number {
  return new Date(2026, 0, day, hour).getTime();
}

function createSession(overrides: Partial<FocusSession> = {}): FocusSession {
  const duration = overrides.duration ?? 60_000;
  const startedAt = overrides.startedAt ?? timestamp(5);

  return {
    id: `session-${startedAt}-${duration}`,
    subject: '数学',
    projectId: null,
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

  it('groups valid sessions by project and keeps legacy subjects separate', () => {
    const summaries = calculateProjectSummaries(
      [
        createSession({ id: 'math-valid', projectId: mathProject.id, duration: 120_000 }),
        createSession({ id: 'legacy-english', projectId: null, subject: '英语阅读' }),
        createSession({ id: 'math-short', projectId: mathProject.id, duration: 20_000 })
      ],
      [DEFAULT_PROJECT, mathProject],
      timestamp(5, 20)
    );

    expect(summaries).toEqual([
      expect.objectContaining({
        key: `project:${mathProject.id}`,
        projectId: mathProject.id,
        name: mathProject.name,
        totalDuration: 120_000,
        todayDuration: 120_000,
        sessionCount: 1,
        share: 2 / 3
      }),
      expect.objectContaining({
        key: 'legacy:英语阅读',
        projectId: null,
        name: '英语阅读',
        isLegacy: true,
        totalDuration: 60_000,
        sessionCount: 1,
        share: 1 / 3
      })
    ]);
  });

  it('returns seven contiguous days including dates without valid focus', () => {
    const totals = calculateRecentDailyTotals(
      [
        createSession({ id: 'first', startedAt: timestamp(5), duration: 60_000 }),
        createSession({ id: 'invalid', startedAt: timestamp(6), duration: 20_000 })
      ],
      timestamp(7),
      3
    );

    expect(totals).toEqual([
      { date: '2026-01-05', duration: 60_000 },
      { date: '2026-01-06', duration: 0 },
      { date: '2026-01-07', duration: 0 }
    ]);
  });
});

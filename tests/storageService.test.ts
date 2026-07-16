import { describe, expect, it } from 'vitest';
import type { FocusSession } from '../src/types';
import { loadSessions, normalizeRecord, persistSessions } from '../src/services/storageService';

const browserSession: FocusSession = {
  id: 'browser-session',
  subject: '英语',
  startedAt: 1_000,
  endedAt: 61_000,
  duration: 60_000,
  targetDuration: 1_800_000,
  status: 'completed',
  mode: 'focus'
};

describe('storage record validation', () => {
  it('normalizes legacy seconds fields and safe defaults', () => {
    expect(
      normalizeRecord({
        id: 'legacy',
        startedAt: 10,
        endedAt: 70,
        duration_seconds: 60
      })
    ).toEqual({
      id: 'legacy',
      subject: '学习',
      startedAt: 10,
      endedAt: 70,
      duration: 60_000,
      targetDuration: 3_600_000,
      status: 'completed',
      mode: 'focus'
    });
  });

  it('rejects records without a complete numeric identity and time range', () => {
    expect(normalizeRecord({ id: 'broken', startedAt: 1, endedAt: 2 })).toBeNull();
    expect(
      normalizeRecord({
        id: 'broken-time',
        startedAt: Number.NaN,
        endedAt: 2,
        duration: 1
      })
    ).toBeNull();
  });

  it('persists and loads sessions through the browser fallback', async () => {
    await expect(persistSessions([browserSession])).resolves.toEqual({ warning: null });
    expect(localStorage.getItem('study-timer-sessions')).not.toBeNull();
    await expect(loadSessions()).resolves.toEqual({
      sessions: [browserSession],
      warning: null
    });
  });
});

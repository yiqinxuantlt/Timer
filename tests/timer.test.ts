import { describe, expect, it } from 'vitest';
import { calculateElapsed, calculateProgress } from '../src/utils/timer';

describe('timer utilities', () => {
  it('keeps the completed duration after the active timestamps are cleared', () => {
    expect(
      calculateElapsed({
        status: 'COMPLETED',
        startedAt: null,
        pausedAt: null,
        cumulativePausedDuration: 0,
        completedDuration: 3_600_000
      })
    ).toBe(3_600_000);
  });

  it('freezes elapsed time while paused', () => {
    expect(
      calculateElapsed(
        {
          status: 'PAUSED',
          startedAt: 1_000,
          pausedAt: 6_000,
          cumulativePausedDuration: 1_000,
          completedDuration: null
        },
        10_000
      )
    ).toBe(4_000);
  });

  it('treats the Unix epoch as a valid start timestamp', () => {
    expect(
      calculateElapsed(
        {
          status: 'RUNNING',
          startedAt: 0,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: null
        },
        5_000
      )
    ).toBe(5_000);
  });

  it('clamps progress to the inclusive zero-to-one range', () => {
    expect(calculateProgress(-1, 1_000)).toBe(0);
    expect(calculateProgress(500, 1_000)).toBe(0.5);
    expect(calculateProgress(2_000, 1_000)).toBe(1);
  });
});

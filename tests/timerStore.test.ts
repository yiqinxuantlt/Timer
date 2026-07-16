import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTimerStore } from '../src/stores/timerStore';

afterEach(() => {
  useTimerStore.getState().reset();
});

describe('timer store', () => {
  it('completes a timer that started at the Unix epoch and retains its duration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5_000);
    useTimerStore.setState({
      status: 'RUNNING',
      startedAt: 0,
      pausedAt: null,
      cumulativePausedDuration: 0,
      completedDuration: null,
      mode: 'focus',
      pomodoroPhase: null
    });

    await useTimerStore.getState().complete();

    expect(useTimerStore.getState()).toMatchObject({
      status: 'COMPLETED',
      startedAt: null,
      completedDuration: 5_000
    });
  });
});

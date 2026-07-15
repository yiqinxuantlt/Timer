import { useEffect, useMemo, useState } from 'react';
import { useTimerStore } from '../stores/timerStore';
import type { TimerStatus } from '../types';
import { calculateElapsed, calculateProgress } from '../utils/timer';

function useTimerTick(status: TimerStatus): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'RUNNING') {
      setNow(Date.now());
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      setNow(Date.now());
      timeout = setTimeout(tick, 250);
    };

    tick();

    return () => {
      disposed = true;
      if (timeout !== null) clearTimeout(timeout);
    };
  }, [status]);

  return now;
}

export function useTimer() {
  const status = useTimerStore((state) => state.status);
  const startedAt = useTimerStore((state) => state.startedAt);
  const pausedAt = useTimerStore((state) => state.pausedAt);
  const targetDuration = useTimerStore((state) => state.targetDuration);
  const cumulativePausedDuration = useTimerStore((state) => state.cumulativePausedDuration);
  const completedDuration = useTimerStore((state) => state.completedDuration);
  const now = useTimerTick(status);

  const elapsed = useMemo(
    () =>
      calculateElapsed(
        {
          status,
          startedAt,
          pausedAt,
          cumulativePausedDuration,
          completedDuration,
        },
        now
      ),
    [status, startedAt, pausedAt, cumulativePausedDuration, completedDuration, now]
  );

  return {
    elapsed,
    progress: calculateProgress(elapsed, targetDuration),
    status,
  };
}

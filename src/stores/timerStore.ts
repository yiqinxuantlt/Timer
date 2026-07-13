import { create } from 'zustand';
import type { TimerStatus, TimerState } from '../types';
import { useStatsStore } from './statsStore';

interface TimerActions {
  start: (subject?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: (save?: boolean) => void;
  complete: () => void;
  reset: () => void;
  setTargetDuration: (ms: number) => void;
  setSubject: (subject: string) => void;
}

type TimerStore = TimerState & TimerActions;

const initialState: TimerState = {
  status: 'IDLE',
  startedAt: null,
  targetDuration: 3600000,
  pausedAt: null,
  cumulativePausedDuration: 0,
  subject: '学习',
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  ...initialState,

  start: (subject?: string) => {
    const now = Date.now();
    set({
      status: 'RUNNING',
      startedAt: now,
      pausedAt: null,
      cumulativePausedDuration: 0,
      subject: subject ?? get().subject,
    });
  },

  pause: () => {
    const { status } = get();
    if (status !== 'RUNNING') return;
    set({
      status: 'PAUSED',
      pausedAt: Date.now(),
    });
  },

  resume: () => {
    const { pausedAt, cumulativePausedDuration, status } = get();
    if (status !== 'PAUSED' || !pausedAt) return;

    const pauseDuration = Date.now() - pausedAt;
    set({
      status: 'RUNNING',
      pausedAt: null,
      cumulativePausedDuration: cumulativePausedDuration + pauseDuration,
    });
  },

  stop: (save = true) => {
    const { status, startedAt, pausedAt, cumulativePausedDuration, subject, targetDuration } = get();
    if (status !== 'RUNNING' && status !== 'PAUSED') return;

    if (save && startedAt) {
      // 暂停状态下，有效结束时间取 pausedAt 而非 Date.now()
      const effectiveEnd = status === 'PAUSED' && pausedAt ? pausedAt : Date.now();
      const elapsed = effectiveEnd - startedAt - cumulativePausedDuration;
      if (elapsed > 0) {
        useStatsStore.getState().addSession({
          subject,
          startedAt,
          endedAt: effectiveEnd,
          duration: elapsed,
          targetDuration,
        });
      }
    }
    set({
      status: 'IDLE',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
    });
  },

  complete: () => {
    const { status, startedAt, cumulativePausedDuration, subject, targetDuration } = get();
    if (status !== 'RUNNING') return;
    if (!startedAt) return;

    const elapsed = Date.now() - startedAt - cumulativePausedDuration;
    if (elapsed > 0) {
      useStatsStore.getState().addSession({
        subject,
        startedAt,
        endedAt: Date.now(),
        duration: elapsed,
        targetDuration,
      });
    }
    set({
      status: 'COMPLETED',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
    });
  },

  reset: () => {
    set({
      status: 'IDLE',
      startedAt: null,
      pausedAt: null,
      cumulativePausedDuration: 0,
    });
  },

  setTargetDuration: (ms) => set({ targetDuration: ms }),
  setSubject: (subject) => set({ subject }),
}));

// Utility hook: get elapsed time without setInterval decrement
export function useElapsed(): number {
  const { status, startedAt, pausedAt, cumulativePausedDuration } =
    useTimerStore();

  if (status === 'IDLE' || !startedAt) return 0;

  const now = Date.now();
  const effectiveEnd = pausedAt ?? now;
  return Math.max(0, effectiveEnd - startedAt - cumulativePausedDuration);
}

// Utility hook: get progress percentage (0–1)
export function useProgress(): number {
  const targetDuration = useTimerStore((s) => s.targetDuration);
  const elapsed = useElapsed();

  if (targetDuration <= 0) return 0;
  return Math.min(elapsed / targetDuration, 1);
}

// Utility hook: get current timer status
export function useTimerStatus(): TimerStatus {
  return useTimerStore((s) => s.status);
}

// Helper: format elapsed ms to HH:MM:SS
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Helper: format elapsed ms to short form (e.g. "1h 30m")
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

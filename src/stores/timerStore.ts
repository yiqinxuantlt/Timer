import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  restoreFromPersisted: () => void;
}

type TimerStore = TimerState & TimerActions;

const initialState: TimerState = {
  status: 'IDLE',
  startedAt: null,
  targetDuration: 3600000,
  pausedAt: null,
  cumulativePausedDuration: 0,
  subject: '学习',
  completedDuration: null,
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: (subject?: string) => {
        const now = Date.now();
        set({
          status: 'RUNNING',
          startedAt: now,
          pausedAt: null,
          cumulativePausedDuration: 0,
          subject: subject ?? get().subject,
          completedDuration: null,
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
          completedDuration: elapsed,
        });
      },

      reset: () => {
        set({
          status: 'IDLE',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: null,
        });
      },

      setTargetDuration: (ms) => set({ targetDuration: ms }),
      setSubject: (subject) => set({ subject }),

      // 从持久化恢复时，检查计时状态是否有效
      restoreFromPersisted: () => {
        const { status, startedAt, pausedAt, cumulativePausedDuration } = get();

        // 如果正在运行但已暂停超过 24 小时，重置为 IDLE
        if (status === 'RUNNING' && startedAt) {
          const now = Date.now();
          const elapsed = now - startedAt - cumulativePausedDuration;
          // 如果计时超过 24 小时，认为已过期
          if (elapsed > 24 * 60 * 60 * 1000) {
            set({
              status: 'IDLE',
              startedAt: null,
              pausedAt: null,
              cumulativePausedDuration: 0,
            });
          }
        }

        // 如果暂停状态超过 24 小时，重置为 IDLE
        if (status === 'PAUSED' && pausedAt) {
          const now = Date.now();
          if (now - pausedAt > 24 * 60 * 60 * 1000) {
            set({
              status: 'IDLE',
              startedAt: null,
              pausedAt: null,
              cumulativePausedDuration: 0,
            });
          }
        }
      },
    }),
    {
      name: 'study-timer-state',
      storage: createJSONStorage(() => localStorage),
      // 排除 completedDuration，不需要持久化
      partialize: (state) => ({
        status: state.status,
        startedAt: state.startedAt,
        targetDuration: state.targetDuration,
        pausedAt: state.pausedAt,
        cumulativePausedDuration: state.cumulativePausedDuration,
        subject: state.subject,
      }),
    }
  )
);

// Utility hook: get elapsed time without setInterval decrement
export function useElapsed(): number {
  const { status, startedAt, pausedAt, cumulativePausedDuration, completedDuration } =
    useTimerStore();

  // COMPLETED 状态下使用保留的最终时长
  if (status === 'COMPLETED') {
    return completedDuration ?? 0;
  }

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

// Helper: format elapsed ms to short form (e.g. "1h 30m", "42s")
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}
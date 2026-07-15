import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FocusSession, TimerState } from '../types';
import { MIN_VALID_DURATION_MS } from '../utils/stats';
import { calculateElapsed, getSessionEnd, isTimerActive } from '../utils/timer';
import { useStatsStore } from './statsStore';

interface TimerActions {
  start: (subject?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: (save?: boolean) => Promise<void>;
  complete: () => Promise<void>;
  reset: () => void;
  setTargetDuration: (ms: number) => void;
  setSubject: (subject: string) => void;
  restoreFromPersisted: () => void;
}

type TimerStore = TimerState & TimerActions;

const initialState: TimerState = {
  status: 'IDLE',
  startedAt: null,
  targetDuration: 3_600_000,
  pausedAt: null,
  cumulativePausedDuration: 0,
  subject: '学习',
  completedDuration: null,
};

function createSession(state: TimerState, endedAt: number): Omit<FocusSession, 'id'> | null {
  if (!state.startedAt) return null;

  return {
    subject: state.subject.trim() || '学习',
    startedAt: state.startedAt,
    endedAt,
    duration: calculateElapsed(state, endedAt),
    targetDuration: state.targetDuration,
    status: 'completed',
  };
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: (subject) => {
        const current = get();
        if (current.status !== 'IDLE' && current.status !== 'COMPLETED') return;

        set({
          status: 'RUNNING',
          startedAt: Date.now(),
          pausedAt: null,
          cumulativePausedDuration: 0,
          subject: subject?.trim() || current.subject || '学习',
          completedDuration: null,
        });
      },

      pause: () => {
        if (get().status !== 'RUNNING') return;
        set({ status: 'PAUSED', pausedAt: Date.now() });
      },

      resume: () => {
        const { status, pausedAt, cumulativePausedDuration } = get();
        if (status !== 'PAUSED' || pausedAt === null) return;

        set({
          status: 'RUNNING',
          pausedAt: null,
          cumulativePausedDuration: cumulativePausedDuration + (Date.now() - pausedAt),
        });
      },

      stop: async (save = true) => {
        const current = get();
        if (!isTimerActive(current.status) || !current.startedAt) return;

        const endedAt = getSessionEnd(current);
        const session = endedAt === null ? null : createSession(current, endedAt);

        set({
          status: 'CANCELLED',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: session?.duration ?? 0,
        });

        if (save && session && session.duration >= MIN_VALID_DURATION_MS) {
          await useStatsStore.getState().addSession(session);
        }

        set({ status: 'IDLE', completedDuration: null });
      },

      complete: async () => {
        const current = get();
        if (current.status !== 'RUNNING' || !current.startedAt) return;

        const endedAt = Date.now();
        const session = createSession(current, endedAt);
        const completedDuration = session?.duration ?? 0;

        set({
          status: 'COMPLETED',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration,
        });

        if (session && session.duration >= MIN_VALID_DURATION_MS) {
          await useStatsStore.getState().addSession(session);
        }
      },

      reset: () =>
        set({
          status: 'IDLE',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: null,
        }),

      setTargetDuration: (ms) => {
        if (ms > 0 && !isTimerActive(get().status)) set({ targetDuration: ms });
      },
      setSubject: (subject) => set({ subject }),

      restoreFromPersisted: () => {
        const { status } = get();
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          set({ ...initialState, targetDuration: get().targetDuration, subject: get().subject });
        }
      },
    }),
    {
      name: 'study-timer-state',
      storage: createJSONStorage(() => localStorage),
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

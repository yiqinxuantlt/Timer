import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FocusSession, TimerMode, TimerState } from '../types';
import { getNextPomodoroPhase, getPomodoroPhaseDuration } from '../utils/pomodoro';
import { MIN_VALID_DURATION_MS } from '../utils/stats';
import { calculateElapsed, getSessionEnd, isTimerActive } from '../utils/timer';
import { useSettingsStore } from './settingsStore';
import { useStatsStore } from './statsStore';

interface TimerActions {
  start: (subject?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: (save?: boolean) => Promise<void>;
  complete: () => Promise<void>;
  reset: () => void;
  setMode: (mode: TimerMode) => void;
  confirmPomodoroPhase: () => void;
  setTargetDuration: (ms: number) => void;
  setSubject: (subject: string) => void;
  restoreFromPersisted: () => void;
}

type TimerStore = TimerState & TimerActions;

const initialState: TimerState = {
  status: 'IDLE',
  mode: 'focus',
  startedAt: null,
  targetDuration: 3_600_000,
  pausedAt: null,
  cumulativePausedDuration: 0,
  subject: '学习',
  completedDuration: null,
  pomodoroPhase: null,
  pomodoroRound: 1,
  pomodoroWaitingForConfirmation: false,
  pomodoroPhaseCompletedAt: null
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
    mode: state.mode
  };
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: (subject) => {
        const current = get();
        if (current.status !== 'IDLE' && current.status !== 'COMPLETED') return;
        if (current.mode === 'pomodoro' && current.pomodoroWaitingForConfirmation) return;

        const pomodoroPhase = current.mode === 'pomodoro' ? 'focus' : null;
        const pomodoroConfig = useSettingsStore.getState().pomodoroConfig;

        set({
          status: 'RUNNING',
          targetDuration:
            current.mode === 'pomodoro'
              ? getPomodoroPhaseDuration('focus', pomodoroConfig)
              : current.targetDuration,
          startedAt: Date.now(),
          pausedAt: null,
          cumulativePausedDuration: 0,
          subject: subject?.trim() || current.subject || '学习',
          completedDuration: null,
          pomodoroPhase,
          pomodoroRound: current.mode === 'pomodoro' ? 1 : current.pomodoroRound,
          pomodoroWaitingForConfirmation: false,
          pomodoroPhaseCompletedAt: null
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
          cumulativePausedDuration: cumulativePausedDuration + (Date.now() - pausedAt)
        });
      },

      stop: async (save = true) => {
        const current = get();
        if (
          current.mode === 'pomodoro' &&
          current.status === 'COMPLETED' &&
          current.pomodoroWaitingForConfirmation
        ) {
          set({
            status: 'CANCELLED',
            completedDuration: null,
            pomodoroPhase: null,
            pomodoroRound: 1,
            pomodoroWaitingForConfirmation: false,
            pomodoroPhaseCompletedAt: null
          });
          set({ status: 'IDLE' });
          return;
        }

        if (!isTimerActive(current.status) || !current.startedAt) return;

        const endedAt = getSessionEnd(current);
        const session =
          endedAt === null || (current.mode === 'pomodoro' && current.pomodoroPhase !== 'focus')
            ? null
            : createSession(current, endedAt);

        set({
          status: 'CANCELLED',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: session?.duration ?? 0,
          pomodoroPhase: null,
          pomodoroRound: 1,
          pomodoroWaitingForConfirmation: false,
          pomodoroPhaseCompletedAt: null
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
        const isPomodoro = current.mode === 'pomodoro';
        const shouldSaveSession = !isPomodoro || current.pomodoroPhase === 'focus';

        set({
          status: 'COMPLETED',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration,
          pomodoroWaitingForConfirmation: isPomodoro,
          pomodoroPhaseCompletedAt: isPomodoro ? endedAt : null
        });

        if (shouldSaveSession && session && session.duration >= MIN_VALID_DURATION_MS) {
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
          pomodoroPhase: null,
          pomodoroRound: 1,
          pomodoroWaitingForConfirmation: false,
          pomodoroPhaseCompletedAt: null
        }),

      setMode: (mode) => {
        const current = get();
        if (isTimerActive(current.status) || current.pomodoroWaitingForConfirmation) return;

        const isPomodoro = mode === 'pomodoro';
        const pomodoroConfig = useSettingsStore.getState().pomodoroConfig;
        set({
          mode,
          status: 'IDLE',
          startedAt: null,
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: null,
          targetDuration: isPomodoro
            ? getPomodoroPhaseDuration('focus', pomodoroConfig)
            : current.targetDuration,
          pomodoroPhase: null,
          pomodoroRound: 1,
          pomodoroWaitingForConfirmation: false,
          pomodoroPhaseCompletedAt: null
        });
      },

      confirmPomodoroPhase: () => {
        const current = get();
        if (
          current.mode !== 'pomodoro' ||
          current.status !== 'COMPLETED' ||
          !current.pomodoroWaitingForConfirmation ||
          !current.pomodoroPhase
        ) {
          return;
        }

        const config = useSettingsStore.getState().pomodoroConfig;
        const transition = getNextPomodoroPhase(
          current.pomodoroPhase,
          current.pomodoroRound,
          config.cyclesBeforeLongBreak
        );

        set({
          status: 'RUNNING',
          startedAt: Date.now(),
          targetDuration: getPomodoroPhaseDuration(transition.phase, config),
          pausedAt: null,
          cumulativePausedDuration: 0,
          completedDuration: null,
          pomodoroPhase: transition.phase,
          pomodoroRound: transition.round,
          pomodoroWaitingForConfirmation: false,
          pomodoroPhaseCompletedAt: null
        });
      },

      setTargetDuration: (ms) => {
        if (ms > 0 && !isTimerActive(get().status)) set({ targetDuration: ms });
      },
      setSubject: (subject) => set({ subject }),

      restoreFromPersisted: () => {
        const current = get();
        if (
          current.mode === 'pomodoro' &&
          current.status === 'COMPLETED' &&
          current.pomodoroWaitingForConfirmation
        ) {
          return;
        }

        if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
          set({
            ...initialState,
            mode: current.mode,
            targetDuration: current.targetDuration,
            subject: current.subject
          });
        }
      }
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
        mode: state.mode,
        pomodoroPhase: state.pomodoroPhase,
        pomodoroRound: state.pomodoroRound,
        pomodoroWaitingForConfirmation: state.pomodoroWaitingForConfirmation,
        pomodoroPhaseCompletedAt: state.pomodoroPhaseCompletedAt,
        completedDuration: state.completedDuration
      })
    }
  )
);

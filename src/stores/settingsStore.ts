import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppSettings, PomodoroConfig } from '../types';
import { DEFAULT_POMODORO_CONFIG, normalizePomodoroConfig } from '../utils/pomodoro';

interface SettingsState extends AppSettings {
  setDefaultTargetDuration: (ms: number) => void;
  setPomodoroConfig: (update: Partial<PomodoroConfig>) => void;
  resetPomodoroConfig: () => void;
  toggleAlwaysOnTop: () => void;
  toggleNotification: () => void;
  toggleGlobalShortcuts: () => void;
  toggleCompactMode: () => void;
  addRecentSubject: (subject: string) => void;
}

interface PersistedSettings {
  defaultTargetDuration?: unknown;
  targetDuration?: unknown;
  pomodoroConfig?: unknown;
  alwaysOnTop?: unknown;
  notificationEnabled?: unknown;
  globalShortcutsEnabled?: unknown;
  recentSubjects?: unknown;
  compactMode?: unknown;
}

const defaultSettings: AppSettings = {
  defaultTargetDuration: 3_600_000,
  pomodoroConfig: DEFAULT_POMODORO_CONFIG,
  alwaysOnTop: true,
  notificationEnabled: true,
  globalShortcutsEnabled: false,
  recentSubjects: [],
  compactMode: false
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getPersistedSettings(value: unknown): PersistedSettings {
  if (!isRecord(value)) return {};
  return value as PersistedSettings;
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function getSubjects(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((subject): subject is string => typeof subject === 'string')
    : [];
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setDefaultTargetDuration: (ms) => {
        if (ms > 0) set({ defaultTargetDuration: ms });
      },
      setPomodoroConfig: (update) => {
        set({
          pomodoroConfig: normalizePomodoroConfig({
            ...get().pomodoroConfig,
            ...update
          })
        });
      },
      resetPomodoroConfig: () => set({ pomodoroConfig: DEFAULT_POMODORO_CONFIG }),
      toggleAlwaysOnTop: () => set({ alwaysOnTop: !get().alwaysOnTop }),
      toggleNotification: () => set({ notificationEnabled: !get().notificationEnabled }),
      toggleGlobalShortcuts: () => set({ globalShortcutsEnabled: !get().globalShortcutsEnabled }),
      toggleCompactMode: () => set({ compactMode: !get().compactMode }),

      addRecentSubject: (subject) => {
        const trimmed = subject.trim();
        if (!trimmed) return;

        const filtered = get().recentSubjects.filter(
          (item) => item.toLowerCase() !== trimmed.toLowerCase()
        );
        set({ recentSubjects: [trimmed, ...filtered].slice(0, 5) });
      }
    }),
    {
      name: 'study-timer-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = getPersistedSettings(persistedState);
        return {
          defaultTargetDuration: getNumber(
            state.defaultTargetDuration ?? state.targetDuration,
            defaultSettings.defaultTargetDuration
          ),
          pomodoroConfig: normalizePomodoroConfig(
            isRecord(state.pomodoroConfig) ? (state.pomodoroConfig as Partial<PomodoroConfig>) : {}
          ),
          alwaysOnTop: getBoolean(state.alwaysOnTop, defaultSettings.alwaysOnTop),
          notificationEnabled: getBoolean(
            state.notificationEnabled,
            defaultSettings.notificationEnabled
          ),
          globalShortcutsEnabled: getBoolean(
            state.globalShortcutsEnabled,
            defaultSettings.globalShortcutsEnabled
          ),
          recentSubjects: getSubjects(state.recentSubjects),
          compactMode: getBoolean(state.compactMode, defaultSettings.compactMode)
        };
      }
    }
  )
);

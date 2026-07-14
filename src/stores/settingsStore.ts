import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  setTargetDuration: (ms: number) => void;
  toggleAlwaysOnTop: () => void;
  toggleNotification: () => void;
  toggleGlobalShortcuts: () => void;
}

// Default settings
const defaultSettings: AppSettings = {
  targetDuration: 3600000,
  alwaysOnTop: true,
  notificationEnabled: true,
  globalShortcutsEnabled: false, // 默认关闭全局快捷键
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setTargetDuration: (ms) => set({ targetDuration: ms }),
      toggleAlwaysOnTop: () => {
        const newOnTop = !get().alwaysOnTop;
        set({ alwaysOnTop: newOnTop });
        // Will call Tauri API in Phase 3
      },
      toggleNotification: () =>
        set({ notificationEnabled: !get().notificationEnabled }),
      toggleGlobalShortcuts: () =>
        set({ globalShortcutsEnabled: !get().globalShortcutsEnabled }),
    }),
    {
      name: 'study-timer-settings',
      storage: createJSONStorage(() => localStorage),
      // Phase 3 will migrate to Tauri Store
    }
  )
);
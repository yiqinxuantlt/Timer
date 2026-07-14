import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  setTargetDuration: (ms: number) => void;
  toggleAlwaysOnTop: () => void;
  toggleNotification: () => void;
  toggleGlobalShortcuts: () => void;
  addRecentSubject: (subject: string) => void;
}

// Default settings
const defaultSettings: AppSettings = {
  targetDuration: 3600000,
  alwaysOnTop: true,
  notificationEnabled: true,
  globalShortcutsEnabled: false, // 默认关闭全局快捷键
  recentSubjects: [],
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

      addRecentSubject: (subject) => {
        const trimmed = subject.trim();
        if (!trimmed) return;

        const current = get().recentSubjects;
        // 移除重复项（不区分大小写）
        const filtered = current.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
        // 添加到头部，最多保留 5 个
        const updated = [trimmed, ...filtered].slice(0, 5);
        set({ recentSubjects: updated });
      },
    }),
    {
      name: 'study-timer-settings',
      storage: createJSONStorage(() => localStorage),
      // Phase 3 will migrate to Tauri Store
    }
  )
);
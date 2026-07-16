import { create } from 'zustand';
import type { FocusSession } from '../types';
import { loadSessions, persistSessions } from '../services/storageService';
import {
  calculateStreak,
  calculateTodayTotal,
  calculateTotalDuration,
  isValidSession
} from '../utils/stats';

interface StatsState {
  sessions: FocusSession[];
  todayTotal: number;
  totalDuration: number;
  currentStreak: number;
  storageWarning: string | null;
  loaded: boolean;

  addSession: (session: Omit<FocusSession, 'id'>) => Promise<boolean>;
  deleteSession: (id: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getDerivedStats(sessions: FocusSession[]) {
  return {
    todayTotal: calculateTodayTotal(sessions),
    totalDuration: calculateTotalDuration(sessions),
    currentStreak: calculateStreak(sessions)
  };
}

let loadPromise: Promise<void> | null = null;

export const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  todayTotal: 0,
  totalDuration: 0,
  currentStreak: 0,
  storageWarning: null,
  loaded: false,

  addSession: async (session) => {
    const newSession: FocusSession = { ...session, id: createSessionId() };
    if (!isValidSession(newSession)) return false;

    const sessions = [...get().sessions, newSession];
    set({ sessions, ...getDerivedStats(sessions) });
    const result = await persistSessions(sessions);
    set({ storageWarning: result.warning });
    return true;
  },

  deleteSession: async (id) => {
    const sessions = get().sessions.filter((session) => session.id !== id);
    if (sessions.length === get().sessions.length) return;

    set({ sessions, ...getDerivedStats(sessions) });
    const result = await persistSessions(sessions);
    set({ storageWarning: result.warning });
  },

  clearAllSessions: async () => {
    set({ sessions: [], todayTotal: 0, totalDuration: 0, currentStreak: 0 });
    const result = await persistSessions([]);
    set({ storageWarning: result.warning });
  },

  loadFromStorage: async () => {
    if (get().loaded) return;

    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const result = await loadSessions();
        set({
          sessions: result.sessions,
          ...getDerivedStats(result.sessions),
          storageWarning: result.warning,
          loaded: true
        });
      } catch (error) {
        console.error('Failed to load study sessions:', error);
        set({
          storageWarning: '无法加载学习记录。请检查桌面数据文件后重试。',
          loaded: true
        });
      }
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }
}));

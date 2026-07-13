import { create } from 'zustand';
import type { FocusSession } from '../types';
import { isTauri } from '../lib/platform';

// Lazy load invoke only when needed
async function getInvoke() {
  const runningInTauri = await isTauri();
  if (!runningInTauri) return null;
  try {
    const mod = await import('@tauri-apps/api/core');
    return mod.invoke;
  } catch {
    return null;
  }
}

interface StatsState {
  sessions: FocusSession[];
  todayTotal: number;
  currentStreak: number;
  loaded: boolean;

  // Actions
  addSession: (session: Omit<FocusSession, 'id'>) => void;
  deleteSession: (id: string) => void;
  loadFromStorage: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  todayTotal: 0,
  currentStreak: 0,
  loaded: false,

  addSession: (session) => {
    const newSession: FocusSession = {
      ...session,
      id: crypto.randomUUID(),
    };

    set((state) => {
      const sessions = [...state.sessions, newSession];
      const todayTotal = recalculateTodayTotal(sessions);
      const currentStreak = recalculateStreak(sessions);
      return { sessions, todayTotal, currentStreak };
    });

    // Persist sessions (localStorage always, Tauri backend if available)
    persistSessions(get().sessions);
  },

  deleteSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const todayTotal = recalculateTodayTotal(sessions);
      const currentStreak = recalculateStreak(sessions);
      return { sessions, todayTotal, currentStreak };
    });

    persistSessions(get().sessions);
  },

  loadFromStorage: async () => {
    try {
      const sessions = await loadSessionsFromBackend();
      set({
        sessions,
        todayTotal: recalculateTodayTotal(sessions),
        currentStreak: recalculateStreak(sessions),
        loaded: true,
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // Fallback: try localStorage
      try {
        const local = localStorage.getItem('study-timer-sessions');
        if (local) {
          const sessions: FocusSession[] = JSON.parse(local);
          set({
            sessions,
            todayTotal: recalculateTodayTotal(sessions),
            currentStreak: recalculateStreak(sessions),
            loaded: true,
          });
        } else {
          set({ loaded: true });
        }
      } catch {
        set({ loaded: true });
      }
    }
  },
}));

// Helper: recalculate today's total duration
function recalculateTodayTotal(sessions: FocusSession[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return sessions
    .filter((s) => s.endedAt >= todayStart.getTime())
    .reduce((sum, s) => sum + s.duration, 0);
}

// Helper: calculate consecutive days streak
function recalculateStreak(sessions: FocusSession[]): number {
  if (sessions.length === 0) return 0;

  const dates = new Set<string>();
  sessions.forEach((s) => {
    const d = new Date(s.endedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dates.add(key);
  });

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

interface SessionRecord {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration_seconds: number;
  targetDuration: number;
}

// Persist to localStorage and Tauri backend (if available)
async function persistSessions(sessions: FocusSession[]) {
  // Always save to localStorage as baseline
  localStorage.setItem('study-timer-sessions', JSON.stringify(sessions));

  // Also try Tauri backend if available
  try {
    const invoke = await getInvoke();
    if (!invoke) return;

    // Preserve complete session data
    const records: SessionRecord[] = sessions.map((s) => ({
      id: s.id,
      subject: s.subject,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      duration_seconds: Math.floor(s.duration / 1000),
      targetDuration: s.targetDuration,
    }));

    const total_seconds = records.reduce((sum, r) => sum + r.duration_seconds, 0);

    await invoke('save_study_data', {
      data: { records, total_seconds },
    });
  } catch (error) {
    console.error('Failed to persist sessions via Tauri:', error);
  }
}

// Load sessions from localStorage (with Tauri backend as primary if available)
async function loadSessionsFromBackend(): Promise<FocusSession[]> {
  // Try Tauri backend first
  try {
    const invoke = await getInvoke();
    if (invoke) {
      const data = await invoke<{
        records: Array<{
          id: string;
          subject: string;
          startedAt: number;
          endedAt: number;
          duration_seconds: number;
          targetDuration: number;
        }>;
        total_seconds: number;
      }>('get_study_data');
      return data.records.map((r) => ({
        id: r.id,
        subject: r.subject,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        duration: r.duration_seconds * 1000,
        targetDuration: r.targetDuration,
      }));
    }
  } catch (error) {
    console.error('Failed to load from Tauri backend:', error);
  }

  // Fallback to localStorage
  const local = localStorage.getItem('study-timer-sessions');
  if (local) {
    return JSON.parse(local);
  }

  return [];
}
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
// 按时间区间重叠计算，跨午夜时按比例分配到各天
function recalculateTodayTotal(sessions: FocusSession[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  let totalMs = 0;

  for (const session of sessions) {
    // 计算该记录与今天时间区间的重叠
    const overlap = calculateSessionDayOverlap(
      session.startedAt,
      session.endedAt,
      todayStart.getTime(),
      todayEnd.getTime()
    );
    totalMs += overlap;
  }

  return totalMs;
}

// 计算单个记录与指定日期的重叠时长（毫秒）
function calculateSessionDayOverlap(
  sessionStart: number,
  sessionEnd: number,
  dayStart: number,
  dayEnd: number
): number {
  // 无重叠
  if (sessionEnd <= dayStart || sessionStart >= dayEnd) {
    return 0;
  }

  // 计算重叠区间
  const overlapStart = Math.max(sessionStart, dayStart);
  const overlapEnd = Math.min(sessionEnd, dayEnd);

  return Math.max(0, overlapEnd - overlapStart);
}

// Helper: calculate consecutive days streak
// 按实际发生日期（按 startedAt 和 endedAt 覆盖的日期）计算
function recalculateStreak(sessions: FocusSession[]): number {
  if (sessions.length === 0) return 0;

  // 收集所有有记录的日期（按记录覆盖的日期）
  const datesWithActivity = new Set<string>();

  for (const session of sessions) {
    // 获取该记录覆盖的所有日期
    const dates = getSessionCoveredDates(session.startedAt, session.endedAt);
    dates.forEach((d) => datesWithActivity.add(d));
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    if (datesWithActivity.has(key)) {
      streak++;
    } else if (i > 0) {
      // 今天没有记录不算断连，但之前某天没有就断了
      break;
    }
  }

  return streak;
}

// 获取记录覆盖的所有日期
function getSessionCoveredDates(startedAt: number, endedAt: number): string[] {
  const dates: string[] = [];

  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endedAt);
  end.setHours(0, 0, 0, 0);

  // 如果在同一天，只返回一天
  if (start.getTime() === end.getTime()) {
    dates.push(`${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`);
    return dates;
  }

  // 跨天：遍历每一天
  const current = new Date(start);
  while (current <= end) {
    dates.push(`${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
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
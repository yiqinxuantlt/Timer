import { isTauri } from '../lib/platform';
import type { FocusSession, SessionStatus, StudyRecord } from '../types';

const LOCAL_SESSIONS_KEY = 'study-timer-sessions';

interface Invoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

interface RawStudyRecord {
  id?: unknown;
  subject?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  duration?: unknown;
  duration_seconds?: unknown;
  targetDuration?: unknown;
  status?: unknown;
}

interface RawStudyData {
  records?: unknown;
  total_seconds?: unknown;
}

let writeQueue: Promise<void> = Promise.resolve();

function getBrowserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

async function getInvoke(): Promise<Invoke | null> {
  if (!(await isTauri())) return null;

  try {
    const module = await import('@tauri-apps/api/core');
    return module.invoke as Invoke;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toStatus(value: unknown): SessionStatus {
  return value === 'cancelled' ? 'cancelled' : 'completed';
}

function normalizeRecord(record: RawStudyRecord): FocusSession | null {
  const id = typeof record.id === 'string' ? record.id : null;
  const subject = typeof record.subject === 'string' ? record.subject : '学习';
  const startedAt = toNumber(record.startedAt, NaN);
  const endedAt = toNumber(record.endedAt, NaN);
  const targetDuration = toNumber(record.targetDuration, 3_600_000);
  const rawDuration = toNumber(record.duration, NaN);
  const durationSeconds = toNumber(record.duration_seconds, NaN);
  const duration = Number.isFinite(rawDuration) ? rawDuration : durationSeconds * 1000;

  if (!id || !Number.isFinite(startedAt) || !Number.isFinite(endedAt) || !Number.isFinite(duration)) {
    return null;
  }

  return {
    id,
    subject,
    startedAt,
    endedAt,
    duration,
    targetDuration,
    status: toStatus(record.status),
  };
}

function readLocalSessions(): FocusSession[] {
  try {
    const storage = getBrowserStorage();
    if (!storage) return [];

    const raw = storage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((value) => {
      if (!isRecord(value)) return [];
      const session = normalizeRecord(value);
      return session ? [session] : [];
    });
  } catch {
    return [];
  }
}

function toStudyRecord(session: FocusSession): StudyRecord {
  return {
    id: session.id,
    subject: session.subject,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    duration_seconds: Math.floor(session.duration / 1000),
    targetDuration: session.targetDuration,
    status: session.status,
  };
}

function writeLocalSessions(sessions: FocusSession[]): boolean {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

function clearLocalSessions(): boolean {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.removeItem(LOCAL_SESSIONS_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function loadSessions(): Promise<FocusSession[]> {
  const localSessions = readLocalSessions();
  const invoke = await getInvoke();
  if (!invoke) return localSessions;

  try {
    const data = await invoke<RawStudyData>('get_study_data');
    const records = Array.isArray(data.records)
      ? data.records.filter(isRecord).map((record) => normalizeRecord(record)).filter(isFocusSession)
      : [];

    if (records.length === 0 && localSessions.length > 0) {
      await persistSessions(localSessions);
      clearLocalSessions();
      return localSessions;
    }

    if (records.length > 0) clearLocalSessions();
    return records;
  } catch {
    return localSessions;
  }
}

function isFocusSession(value: FocusSession | null): value is FocusSession {
  return value !== null;
}

export function persistSessions(sessions: FocusSession[]): Promise<void> {
  const snapshot = sessions.map((session) => ({ ...session }));

  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    try {
      const invoke = await getInvoke();
      if (!invoke) {
        writeLocalSessions(snapshot);
        return;
      }

      const records = snapshot.map(toStudyRecord);
      const data = {
        records,
        total_seconds: records.reduce((total, record) => total + record.duration_seconds, 0),
      };

      try {
        await invoke('save_study_data', { data });
        clearLocalSessions();
      } catch {
        writeLocalSessions(snapshot);
      }
    } catch (error) {
      console.error('Failed to persist study sessions:', error);
    }
  });

  return writeQueue;
}

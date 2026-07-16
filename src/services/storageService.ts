import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { isTauri } from '../lib/platform';
import type { FocusSession, SessionStatus, StudyRecord } from '../types';

const LOCAL_SESSIONS_KEY = 'study-timer-sessions';

interface Invoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface RawStudyRecord {
  id?: unknown;
  subject?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  duration?: unknown;
  duration_seconds?: unknown;
  targetDuration?: unknown;
  status?: unknown;
  mode?: unknown;
}

interface RawStudyData {
  records?: unknown;
  total_seconds?: unknown;
}

export interface StorageResult {
  warning: string | null;
}

export interface LoadSessionsResult extends StorageResult {
  sessions: FocusSession[];
}

let writeQueue: Promise<void> = Promise.resolve();
let desktopPersistenceBlocked = false;

function getBrowserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

async function getInvoke(): Promise<Invoke | null> {
  if (!(await isTauri())) return null;
  return tauriInvoke as Invoke;
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'unknown storage error';
}

function createDesktopWarning(action: string, error: unknown): string {
  const detail = getErrorMessage(error).slice(0, 180);
  return `无法${action}桌面学习记录。已保留浏览器本地副本，应用不会自动覆盖桌面数据文件。原因：${detail}`;
}

export function normalizeRecord(record: RawStudyRecord): FocusSession | null {
  const id = typeof record.id === 'string' ? record.id : null;
  const subject = typeof record.subject === 'string' ? record.subject : '学习';
  const startedAt = toNumber(record.startedAt, Number.NaN);
  const endedAt = toNumber(record.endedAt, Number.NaN);
  const targetDuration = toNumber(record.targetDuration, 3_600_000);
  const rawDuration = toNumber(record.duration, Number.NaN);
  const durationSeconds = toNumber(record.duration_seconds, Number.NaN);
  const duration = Number.isFinite(rawDuration) ? rawDuration : durationSeconds * 1000;

  if (
    !id ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(endedAt) ||
    !Number.isFinite(duration)
  ) {
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
    mode: record.mode === 'pomodoro' ? 'pomodoro' : 'focus'
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
    mode: session.mode
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

function mergeSessions(primary: FocusSession[], fallback: FocusSession[]): FocusSession[] {
  const byId = new Map(primary.map((session) => [session.id, session]));
  fallback.forEach((session) => {
    if (!byId.has(session.id)) byId.set(session.id, session);
  });
  return Array.from(byId.values());
}

function saveFallback(sessions: FocusSession[], warning: string): StorageResult {
  if (writeLocalSessions(sessions)) return { warning };
  return { warning: `${warning} 浏览器本地副本也无法写入。` };
}

export async function loadSessions(): Promise<LoadSessionsResult> {
  const localSessions = readLocalSessions();
  const invoke = await getInvoke();
  if (!invoke) return { sessions: localSessions, warning: null };

  try {
    const data = await invoke<RawStudyData>('get_study_data');
    const rawRecords = Array.isArray(data.records) ? data.records : [];
    const records = rawRecords
      .filter(isRecord)
      .map((record) => normalizeRecord(record))
      .filter(isFocusSession);
    const hasMalformedRecords =
      (data.records !== undefined && !Array.isArray(data.records)) ||
      records.length !== rawRecords.length;

    if (hasMalformedRecords) {
      desktopPersistenceBlocked = true;
      return {
        sessions: mergeSessions(records, localSessions),
        warning:
          '桌面学习记录包含无法识别的数据。已保留浏览器本地副本，应用不会自动覆盖桌面数据文件。'
      };
    }

    desktopPersistenceBlocked = false;

    if (records.length === 0 && localSessions.length > 0) {
      const result = await persistSessions(localSessions);
      if (!result.warning) clearLocalSessions();
      return { sessions: localSessions, warning: result.warning };
    }

    if (records.length > 0) clearLocalSessions();
    return { sessions: records, warning: null };
  } catch (error) {
    desktopPersistenceBlocked = true;
    return {
      sessions: localSessions,
      warning: createDesktopWarning('读取', error)
    };
  }
}

function isFocusSession(value: FocusSession | null): value is FocusSession {
  return value !== null;
}

async function persistSnapshot(snapshot: FocusSession[]): Promise<StorageResult> {
  const invoke = await getInvoke();
  if (!invoke) {
    return writeLocalSessions(snapshot)
      ? { warning: null }
      : { warning: '无法保存浏览器本地学习记录。' };
  }

  if (desktopPersistenceBlocked) {
    return saveFallback(
      snapshot,
      '桌面学习记录仍不可用。已保存到浏览器本地副本，应用不会自动覆盖桌面数据文件。'
    );
  }

  const records = snapshot.map(toStudyRecord);
  const data = {
    records,
    total_seconds: records.reduce((total, record) => total + record.duration_seconds, 0)
  };

  try {
    await invoke('save_study_data', { data });
    desktopPersistenceBlocked = false;
    clearLocalSessions();
    return { warning: null };
  } catch (error) {
    desktopPersistenceBlocked = true;
    return saveFallback(snapshot, createDesktopWarning('保存', error));
  }
}

export function persistSessions(sessions: FocusSession[]): Promise<StorageResult> {
  const snapshot = sessions.map((session) => ({ ...session }));
  const task = writeQueue.catch(() => undefined).then(() => persistSnapshot(snapshot));

  writeQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

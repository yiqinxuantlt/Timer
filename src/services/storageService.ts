import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { isTauri } from '../lib/platform';
import type { FocusSession, SessionStatus, StudyProject, StudyRecord } from '../types';
import { DEFAULT_PROJECT, isStudyProject, normalizeProjects } from '../utils/projects';

const LOCAL_STUDY_DATA_KEY = 'study-timer-sessions';

interface Invoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface RawStudyRecord {
  id?: unknown;
  subject?: unknown;
  projectId?: unknown;
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
  projects?: unknown;
  total_seconds?: unknown;
}

export interface StorageResult {
  warning: string | null;
}

export interface StudyDataSnapshot {
  sessions: FocusSession[];
  projects: StudyProject[];
}

export interface LoadStudyDataResult extends StorageResult, StudyDataSnapshot {}

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

function normalizeProjectId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const projectId = value.trim();
  return projectId || null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'unknown storage error';
}

function createDesktopWarning(action: string, error: unknown): string {
  const detail = getErrorMessage(error).slice(0, 180);
  return (
    '无法' +
    action +
    '桌面学习记录。已保留浏览器本地副本，应用不会自动覆盖桌面数据文件。原因：' +
    detail
  );
}

export function normalizeRecord(record: RawStudyRecord): FocusSession | null {
  const id = typeof record.id === 'string' ? record.id : null;
  const subject = typeof record.subject === 'string' ? record.subject : DEFAULT_PROJECT.name;
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
    projectId: normalizeProjectId(record.projectId),
    startedAt,
    endedAt,
    duration,
    targetDuration,
    status: toStatus(record.status),
    mode: record.mode === 'pomodoro' ? 'pomodoro' : 'focus'
  };
}

function normalizeSessions(value: unknown): FocusSession[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const session = normalizeRecord(item);
    return session ? [session] : [];
  });
}

function normalizeStudyData(value: unknown): StudyDataSnapshot {
  if (Array.isArray(value)) {
    return {
      sessions: normalizeSessions(value),
      projects: [DEFAULT_PROJECT]
    };
  }

  if (!isRecord(value)) {
    return {
      sessions: [],
      projects: [DEFAULT_PROJECT]
    };
  }

  return {
    sessions: normalizeSessions(value.records),
    projects: normalizeProjects(value.projects)
  };
}

function readLocalStudyData(): StudyDataSnapshot {
  try {
    const storage = getBrowserStorage();
    if (!storage) return { sessions: [], projects: [DEFAULT_PROJECT] };

    const raw = storage.getItem(LOCAL_STUDY_DATA_KEY);
    if (!raw) return { sessions: [], projects: [DEFAULT_PROJECT] };

    return normalizeStudyData(JSON.parse(raw));
  } catch {
    return { sessions: [], projects: [DEFAULT_PROJECT] };
  }
}

function toStudyRecord(session: FocusSession): StudyRecord {
  return {
    id: session.id,
    subject: session.subject,
    projectId: session.projectId ?? null,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    duration_seconds: Math.floor(session.duration / 1000),
    targetDuration: session.targetDuration,
    status: session.status,
    mode: session.mode
  };
}

function createDataPayload(snapshot: StudyDataSnapshot): {
  records: StudyRecord[];
  projects: StudyProject[];
  total_seconds: number;
} {
  const projects = normalizeProjects(snapshot.projects);
  const records = snapshot.sessions.map(toStudyRecord);

  return {
    records,
    projects,
    total_seconds: records.reduce((total, record) => total + record.duration_seconds, 0)
  };
}

function normalizeSnapshot(snapshot: StudyDataSnapshot): StudyDataSnapshot {
  return {
    sessions: snapshot.sessions.map((session) => ({
      ...session,
      projectId: session.projectId ?? null
    })),
    projects: normalizeProjects(snapshot.projects)
  };
}

function writeLocalStudyData(snapshot: StudyDataSnapshot): boolean {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.setItem(LOCAL_STUDY_DATA_KEY, JSON.stringify(createDataPayload(snapshot)));
    return true;
  } catch {
    return false;
  }
}

function clearLocalStudyData(): boolean {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.removeItem(LOCAL_STUDY_DATA_KEY);
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

function mergeProjects(primary: StudyProject[], fallback: StudyProject[]): StudyProject[] {
  const byId = new Map(primary.map((project) => [project.id, project]));
  fallback.forEach((project) => {
    if (!byId.has(project.id)) byId.set(project.id, project);
  });
  return normalizeProjects(Array.from(byId.values()));
}

function hasSnapshotData(snapshot: StudyDataSnapshot): boolean {
  return (
    snapshot.sessions.length > 0 ||
    snapshot.projects.some((project) => project.id !== DEFAULT_PROJECT.id)
  );
}

function saveFallback(snapshot: StudyDataSnapshot, warning: string): StorageResult {
  if (writeLocalStudyData(snapshot)) return { warning };
  return { warning: warning + ' 浏览器本地副本也无法写入。' };
}

function getMalformedDataState(data: RawStudyData, sessions: FocusSession[]): boolean {
  const rawRecords = data.records;
  const rawProjects = data.projects;

  const hasMalformedRecords =
    (rawRecords !== undefined && !Array.isArray(rawRecords)) ||
    (Array.isArray(rawRecords) && sessions.length !== rawRecords.length);
  const hasMalformedProjects =
    rawProjects !== undefined &&
    (!Array.isArray(rawProjects) || !rawProjects.every((project) => isStudyProject(project)));

  return hasMalformedRecords || hasMalformedProjects;
}

export async function loadStudyData(): Promise<LoadStudyDataResult> {
  const localSnapshot = readLocalStudyData();
  const invoke = await getInvoke();
  if (!invoke) return { ...localSnapshot, warning: null };

  try {
    const data = await invoke<RawStudyData>('get_study_data');
    const snapshot: StudyDataSnapshot = {
      sessions: normalizeSessions(data.records),
      projects: normalizeProjects(data.projects)
    };

    if (getMalformedDataState(data, snapshot.sessions)) {
      desktopPersistenceBlocked = true;
      return {
        sessions: mergeSessions(snapshot.sessions, localSnapshot.sessions),
        projects: mergeProjects(snapshot.projects, localSnapshot.projects),
        warning:
          '桌面学习记录包含无法识别的数据。已保留浏览器本地副本，应用不会自动覆盖桌面数据文件。'
      };
    }

    desktopPersistenceBlocked = false;

    if (!hasSnapshotData(snapshot) && hasSnapshotData(localSnapshot)) {
      const result = await persistStudyData(localSnapshot);
      if (!result.warning) clearLocalStudyData();
      return { ...localSnapshot, warning: result.warning };
    }

    if (hasSnapshotData(snapshot)) clearLocalStudyData();
    return { ...snapshot, warning: null };
  } catch (error) {
    desktopPersistenceBlocked = true;
    return {
      ...localSnapshot,
      warning: createDesktopWarning('读取', error)
    };
  }
}

async function persistSnapshot(snapshot: StudyDataSnapshot): Promise<StorageResult> {
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  const invoke = await getInvoke();
  if (!invoke) {
    return writeLocalStudyData(normalizedSnapshot)
      ? { warning: null }
      : { warning: '无法保存浏览器本地学习记录。' };
  }

  if (desktopPersistenceBlocked) {
    return saveFallback(
      normalizedSnapshot,
      '桌面学习记录仍不可用。已保存到浏览器本地副本，应用不会自动覆盖桌面数据文件。'
    );
  }

  try {
    await invoke('save_study_data', { data: createDataPayload(normalizedSnapshot) });
    desktopPersistenceBlocked = false;
    clearLocalStudyData();
    return { warning: null };
  } catch (error) {
    desktopPersistenceBlocked = true;
    return saveFallback(normalizedSnapshot, createDesktopWarning('保存', error));
  }
}

export function persistStudyData(snapshot: StudyDataSnapshot): Promise<StorageResult> {
  const copy = normalizeSnapshot(snapshot);
  const task = writeQueue.catch(() => undefined).then(() => persistSnapshot(copy));

  writeQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

// Compatibility helpers for callers that have not yet moved to the project-aware snapshot API.
export async function loadSessions(): Promise<LoadSessionsResult> {
  const result = await loadStudyData();
  return { sessions: result.sessions, warning: result.warning };
}

export async function persistSessions(sessions: FocusSession[]): Promise<StorageResult> {
  const current = await loadStudyData();
  return persistStudyData({ sessions, projects: current.projects });
}


import type { DailyFocusTotal, FocusSession, ProjectSummary, StudyProject } from '../types';
import { DEFAULT_PROJECT } from './projects';

export const MIN_VALID_DURATION_MS = 60_000;

export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidSession(session: FocusSession): boolean {
  return (
    session.status === 'completed' &&
    Number.isFinite(session.duration) &&
    session.duration >= MIN_VALID_DURATION_MS &&
    Number.isFinite(session.startedAt) &&
    Number.isFinite(session.endedAt) &&
    session.endedAt >= session.startedAt
  );
}

export function calculateTodayTotal(sessions: FocusSession[], now = Date.now()): number {
  const today = getDateKey(now);
  return sessions
    .filter((session) => isValidSession(session) && getDateKey(session.startedAt) === today)
    .reduce((total, session) => total + session.duration, 0);
}

export function calculateTotalDuration(sessions: FocusSession[]): number {
  return sessions.filter(isValidSession).reduce((total, session) => total + session.duration, 0);
}

export function calculateStreak(sessions: FocusSession[], now = Date.now()): number {
  const activeDates = new Set(
    sessions.filter(isValidSession).map((session) => getDateKey(session.startedAt))
  );

  let streak = 0;
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - offset);
    if (!activeDates.has(getDateKey(date.getTime()))) break;
    streak += 1;
  }

  return streak;
}

interface ProjectSummaryAccumulator extends Omit<ProjectSummary, 'share'> {}

function getSessionSubject(session: FocusSession): string {
  return session.subject.trim() || DEFAULT_PROJECT.name;
}

function getSummaryForSession(
  session: FocusSession,
  projects: StudyProject[]
): Pick<ProjectSummaryAccumulator, 'key' | 'projectId' | 'name' | 'color' | 'isLegacy'> {
  const projectId = session.projectId ?? null;
  if (projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      return {
        key: `project:${project.id}`,
        projectId: project.id,
        name: project.name,
        color: project.color,
        isLegacy: false
      };
    }

    return {
      key: `missing:${projectId}`,
      projectId,
      name: getSessionSubject(session),
      color: DEFAULT_PROJECT.color,
      isLegacy: false
    };
  }

  const name = getSessionSubject(session);
  return {
    key: `legacy:${name.toLocaleLowerCase()}`,
    projectId: null,
    name,
    color: DEFAULT_PROJECT.color,
    isLegacy: true
  };
}

export function calculateProjectSummaries(
  sessions: FocusSession[],
  projects: StudyProject[],
  now = Date.now()
): ProjectSummary[] {
  const today = getDateKey(now);
  const summaries = new Map<string, ProjectSummaryAccumulator>();
  let totalDuration = 0;

  sessions.filter(isValidSession).forEach((session) => {
    const metadata = getSummaryForSession(session, projects);
    const current = summaries.get(metadata.key) ?? {
      ...metadata,
      todayDuration: 0,
      totalDuration: 0,
      sessionCount: 0
    };

    current.totalDuration += session.duration;
    current.sessionCount += 1;
    if (getDateKey(session.startedAt) === today) current.todayDuration += session.duration;

    totalDuration += session.duration;
    summaries.set(metadata.key, current);
  });

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      share: totalDuration > 0 ? summary.totalDuration / totalDuration : 0
    }))
    .sort(
      (left, right) =>
        right.totalDuration - left.totalDuration || left.name.localeCompare(right.name, 'zh-CN')
    );
}

export function calculateRecentDailyTotals(
  sessions: FocusSession[],
  now = Date.now(),
  days = 7
): DailyFocusTotal[] {
  const dayCount = Math.max(1, Math.floor(days));
  const totalsByDate = new Map<string, number>();

  sessions.filter(isValidSession).forEach((session) => {
    const date = getDateKey(session.startedAt);
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + session.duration);
  });

  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  const totals: DailyFocusTotal[] = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - offset);
    const key = getDateKey(date.getTime());
    totals.push({ date: key, duration: totalsByDate.get(key) ?? 0 });
  }

  return totals;
}

import type { FocusSession } from '../types';

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

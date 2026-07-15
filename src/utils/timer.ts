import type { TimerStatus } from '../types';

export interface TimerSnapshot {
  status: TimerStatus;
  startedAt: number | null;
  pausedAt: number | null;
  cumulativePausedDuration: number;
  completedDuration: number | null;
}

export function calculateElapsed(snapshot: TimerSnapshot, now = Date.now()): number {
  const { status, startedAt, pausedAt, cumulativePausedDuration, completedDuration } = snapshot;

  if (status === 'IDLE' || !startedAt) return 0;
  if (status === 'COMPLETED') return Math.max(0, completedDuration ?? 0);

  const effectiveEnd = status === 'PAUSED' && pausedAt !== null ? pausedAt : now;
  return Math.max(0, effectiveEnd - startedAt - cumulativePausedDuration);
}

export function calculateProgress(elapsed: number, targetDuration: number): number {
  if (targetDuration <= 0) return 0;
  return Math.min(Math.max(elapsed / targetDuration, 0), 1);
}

export function isTimerActive(status: TimerStatus): boolean {
  return status === 'RUNNING' || status === 'PAUSED';
}

export function getSessionEnd(snapshot: TimerSnapshot, now = Date.now()): number | null {
  if (!snapshot.startedAt) return null;
  return snapshot.status === 'PAUSED' && snapshot.pausedAt !== null
    ? snapshot.pausedAt
    : now;
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface TimerState {
  status: TimerStatus;
  startedAt: number | null;
  targetDuration: number;
  pausedAt: number | null;
  cumulativePausedDuration: number;
  subject: string;
}

export interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
}

export interface StudyRecord {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration_seconds: number;
  targetDuration: number;
}

export interface StudyData {
  records: StudyRecord[];
  total_seconds: number;
}

export interface AppSettings {
  targetDuration: number;
  compactMode: boolean;
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
}
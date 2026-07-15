export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type SessionStatus = 'completed' | 'cancelled';

export interface TimerState {
  status: TimerStatus;
  startedAt: number | null;
  targetDuration: number;
  pausedAt: number | null;
  cumulativePausedDuration: number;
  subject: string;
  completedDuration: number | null; // 完成时保留最终时长，用于显示
}

export interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
  status: SessionStatus;
}

export interface StudyRecord {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration_seconds: number;
  targetDuration: number;
  status: SessionStatus;
}

export interface StudyData {
  records: StudyRecord[];
  total_seconds: number;
}

export interface AppSettings {
  defaultTargetDuration: number;
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
  globalShortcutsEnabled: boolean;
  recentSubjects: string[];
  compactMode: boolean;
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

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
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
  globalShortcutsEnabled: boolean;
}
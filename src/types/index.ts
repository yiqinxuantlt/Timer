export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type SessionStatus = 'completed' | 'cancelled';
export type TimerMode = 'focus' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';
export type SessionMode = 'focus' | 'pomodoro';

export interface PomodoroConfig {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
}

export interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  startedAt: number | null;
  targetDuration: number;
  pausedAt: number | null;
  cumulativePausedDuration: number;
  subject: string;
  completedDuration: number | null; // 完成时保留最终时长，用于显示
  pomodoroPhase: PomodoroPhase | null;
  pomodoroRound: number;
  pomodoroWaitingForConfirmation: boolean;
  pomodoroPhaseCompletedAt: number | null;
}

export interface FocusSession {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  targetDuration: number;
  status: SessionStatus;
  mode: SessionMode;
}

export interface StudyRecord {
  id: string;
  subject: string;
  startedAt: number;
  endedAt: number;
  duration_seconds: number;
  targetDuration: number;
  status: SessionStatus;
  mode: SessionMode;
}

export interface StudyData {
  records: StudyRecord[];
  total_seconds: number;
}

export interface AppSettings {
  defaultTargetDuration: number;
  pomodoroConfig: PomodoroConfig;
  alwaysOnTop: boolean;
  notificationEnabled: boolean;
  globalShortcutsEnabled: boolean;
  recentSubjects: string[];
  compactMode: boolean;
}

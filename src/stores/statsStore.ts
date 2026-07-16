import { create } from 'zustand';
import type { FocusSession, ProjectColor, StudyProject } from '../types';
import { loadStudyData, persistStudyData } from '../services/storageService';
import {
  DEFAULT_PROJECT,
  PROJECT_COLORS,
  createProject as buildProject,
  normalizeProjectName
} from '../utils/projects';
import {
  calculateStreak,
  calculateTodayTotal,
  calculateTotalDuration,
  isValidSession
} from '../utils/stats';

interface ProjectInput {
  name: string;
  color: ProjectColor;
}

interface StatsState {
  sessions: FocusSession[];
  projects: StudyProject[];
  todayTotal: number;
  totalDuration: number;
  currentStreak: number;
  storageWarning: string | null;
  loaded: boolean;

  addSession: (session: Omit<FocusSession, 'id'>) => Promise<boolean>;
  deleteSession: (id: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  createProject: (input: ProjectInput) => Promise<StudyProject | null>;
  updateProject: (id: string, input: ProjectInput) => Promise<StudyProject | null>;
  archiveProject: (id: string) => Promise<boolean>;
  restoreProject: (id: string) => Promise<boolean>;
  loadFromStorage: () => Promise<void>;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}

function getDerivedStats(sessions: FocusSession[]) {
  return {
    todayTotal: calculateTodayTotal(sessions),
    totalDuration: calculateTotalDuration(sessions),
    currentStreak: calculateStreak(sessions)
  };
}

function hasDuplicateProjectName(projects: StudyProject[], name: string, excludedId?: string): boolean {
  const nameKey = name.toLocaleLowerCase();
  return projects.some(
    (project) => project.id !== excludedId && project.name.toLocaleLowerCase() === nameKey
  );
}

function isKnownProjectColor(color: ProjectColor): boolean {
  return PROJECT_COLORS.includes(color);
}

let loadPromise: Promise<void> | null = null;

export const useStatsStore = create<StatsState>((set, get) => ({
  sessions: [],
  projects: [DEFAULT_PROJECT],
  todayTotal: 0,
  totalDuration: 0,
  currentStreak: 0,
  storageWarning: null,
  loaded: false,

  addSession: async (session) => {
    const newSession: FocusSession = {
      ...session,
      id: createSessionId(),
      projectId: session.projectId ?? null
    };
    if (!isValidSession(newSession)) return false;

    const sessions = [...get().sessions, newSession];
    const projects = get().projects;
    set({ sessions, ...getDerivedStats(sessions) });
    const result = await persistStudyData({ sessions, projects });
    set({ storageWarning: result.warning });
    return true;
  },

  deleteSession: async (id) => {
    const sessions = get().sessions.filter((session) => session.id !== id);
    if (sessions.length === get().sessions.length) return;

    const projects = get().projects;
    set({ sessions, ...getDerivedStats(sessions) });
    const result = await persistStudyData({ sessions, projects });
    set({ storageWarning: result.warning });
  },

  clearAllSessions: async () => {
    const projects = get().projects;
    set({ sessions: [], todayTotal: 0, totalDuration: 0, currentStreak: 0 });
    const result = await persistStudyData({ sessions: [], projects });
    set({ storageWarning: result.warning });
  },

  createProject: async (input) => {
    const project = buildProject(input.name, input.color, get().projects);
    if (!project) return null;

    const sessions = get().sessions;
    const projects = [...get().projects, project];
    set({ projects });
    const result = await persistStudyData({ sessions, projects });
    set({ storageWarning: result.warning });
    return project;
  },

  updateProject: async (id, input) => {
    const current = get();
    const existing = current.projects.find((project) => project.id === id);
    const name = normalizeProjectName(input.name);
    if (
      !existing ||
      !name ||
      !isKnownProjectColor(input.color) ||
      hasDuplicateProjectName(current.projects, name, id)
    ) {
      return null;
    }

    const project: StudyProject = { ...existing, name, color: input.color };
    const projects = current.projects.map((item) => (item.id === id ? project : item));
    set({ projects });
    const result = await persistStudyData({ sessions: current.sessions, projects });
    set({ storageWarning: result.warning });
    return project;
  },

  archiveProject: async (id) => {
    const current = get();
    const existing = current.projects.find((project) => project.id === id);
    if (!existing || existing.id === DEFAULT_PROJECT.id || existing.archivedAt !== null) {
      return false;
    }

    const projects = current.projects.map((project) =>
      project.id === id ? { ...project, archivedAt: Date.now() } : project
    );
    set({ projects });
    const result = await persistStudyData({ sessions: current.sessions, projects });
    set({ storageWarning: result.warning });
    return true;
  },

  restoreProject: async (id) => {
    const current = get();
    const existing = current.projects.find((project) => project.id === id);
    if (
      !existing ||
      existing.archivedAt === null ||
      hasDuplicateProjectName(current.projects, existing.name, id)
    ) {
      return false;
    }

    const projects = current.projects.map((project) =>
      project.id === id ? { ...project, archivedAt: null } : project
    );
    set({ projects });
    const result = await persistStudyData({ sessions: current.sessions, projects });
    set({ storageWarning: result.warning });
    return true;
  },

  loadFromStorage: async () => {
    if (get().loaded) return;

    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const result = await loadStudyData();
        set({
          sessions: result.sessions,
          projects: result.projects,
          ...getDerivedStats(result.sessions),
          storageWarning: result.warning,
          loaded: true
        });
      } catch (error) {
        console.error('Failed to load study data:', error);
        set({
          storageWarning: '无法加载学习记录，请检查数据文件后重试。',
          loaded: true
        });
      }
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }
}));


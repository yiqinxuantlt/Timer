import type { ProjectColor, StudyProject } from '../types';

export const PROJECT_COLORS: readonly ProjectColor[] = [
  'indigo',
  'violet',
  'cyan',
  'emerald',
  'amber',
  'rose'
];

const PROJECT_COLOR_VALUES: Record<ProjectColor, string> = {
  indigo: '#818cf8',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185'
};

export const DEFAULT_PROJECT: StudyProject = {
  id: 'project-default',
  name: '学习',
  color: 'indigo',
  createdAt: 0,
  archivedAt: null
};

const MAX_PROJECT_NAME_LENGTH = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProjectColor(value: unknown): value is ProjectColor {
  return typeof value === 'string' && PROJECT_COLORS.includes(value as ProjectColor);
}

export function normalizeProjectName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_PROJECT_NAME_LENGTH ? name : null;
}

function normalizeProject(value: unknown): StudyProject | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = normalizeProjectName(value.name);
  const createdAt = value.createdAt;
  const archivedAt = value.archivedAt;

  if (
    !id ||
    !name ||
    !isProjectColor(value.color) ||
    typeof createdAt !== 'number' ||
    !Number.isFinite(createdAt) ||
    (archivedAt !== null && (typeof archivedAt !== 'number' || !Number.isFinite(archivedAt)))
  ) {
    return null;
  }

  return {
    id,
    name,
    color: value.color,
    createdAt,
    archivedAt
  };
}

function projectNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function normalizeProjects(value: unknown): StudyProject[] {
  const rawProjects = Array.isArray(value) ? value : [];
  const projects: StudyProject[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  let defaultProject = DEFAULT_PROJECT;

  for (const rawProject of rawProjects) {
    const project = normalizeProject(rawProject);
    if (!project || ids.has(project.id) || names.has(projectNameKey(project.name))) continue;

    if (project.id === DEFAULT_PROJECT.id) {
      defaultProject = { ...project, archivedAt: null };
      ids.add(project.id);
      names.add(projectNameKey(project.name));
      continue;
    }

    ids.add(project.id);
    names.add(projectNameKey(project.name));
    projects.push(project);
  }

  if (!names.has(projectNameKey(defaultProject.name))) {
    names.add(projectNameKey(defaultProject.name));
  }

  return [defaultProject, ...projects];
}

function createProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createProject(
  name: string,
  color: ProjectColor,
  projects: StudyProject[],
  now = Date.now(),
  createId: () => string = createProjectId
): StudyProject | null {
  const normalizedName = normalizeProjectName(name);
  if (!normalizedName || !isProjectColor(color)) return null;

  const nameKey = projectNameKey(normalizedName);
  if (projects.some((project) => projectNameKey(project.name) === nameKey)) return null;

  const id = createId().trim();
  if (!id || projects.some((project) => project.id === id)) return null;

  return {
    id,
    name: normalizedName,
    color,
    createdAt: now,
    archivedAt: null
  };
}

export function findProjectById(
  projects: StudyProject[],
  projectId: string | null | undefined
): StudyProject {
  return projects.find((project) => project.id === projectId) ?? DEFAULT_PROJECT;
}

export function getProjectColorValue(color: ProjectColor): string {
  return PROJECT_COLOR_VALUES[color];
}

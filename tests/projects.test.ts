import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT,
  createProject,
  findProjectById,
  getProjectColorValue,
  normalizeProjects
} from '../src/utils/projects';

describe('study projects', () => {
  it('keeps one default project and drops malformed or duplicate projects', () => {
    const projects = normalizeProjects([
      { id: 'math', name: '数学', color: 'cyan', createdAt: 1, archivedAt: null },
      { id: 'bad', name: '', color: 'unknown', createdAt: 1, archivedAt: null },
      { id: 'math', name: '重复', color: 'rose', createdAt: 1, archivedAt: null }
    ]);

    expect(projects.map((project) => project.id)).toEqual([DEFAULT_PROJECT.id, 'math']);
    expect(findProjectById(projects, 'missing')).toEqual(DEFAULT_PROJECT);
  });

  it('creates a normalized project and rejects a case-insensitive duplicate', () => {
    const first = createProject('英语阅读', 'violet', [], 42, () => 'english');

    expect(first).toMatchObject({
      id: 'english',
      name: '英语阅读',
      color: 'violet',
      createdAt: 42,
      archivedAt: null
    });
    expect(createProject('英语阅读', 'rose', [first!], 43, () => 'second')).toBeNull();
    expect(getProjectColorValue('emerald')).toBe('#34d399');
  });
});

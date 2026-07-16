import { describe, expect, it } from 'vitest';
import type { FocusSession, StudyProject } from '../src/types';
import {
  loadStudyData,
  normalizeRecord,
  persistStudyData
} from '../src/services/storageService';
import { DEFAULT_PROJECT } from '../src/utils/projects';

const englishProject: StudyProject = {
  id: 'project-english',
  name: '英语阅读',
  color: 'violet',
  createdAt: 1,
  archivedAt: null
};

const browserSession: FocusSession = {
  id: 'browser-session',
  subject: '英语',
  projectId: englishProject.id,
  startedAt: 1_000,
  endedAt: 61_000,
  duration: 60_000,
  targetDuration: 1_800_000,
  status: 'completed',
  mode: 'focus'
};

describe('storage record validation', () => {
  it('normalizes legacy seconds fields and safe defaults', () => {
    expect(
      normalizeRecord({
        id: 'legacy',
        startedAt: 10,
        endedAt: 70,
        duration_seconds: 60
      })
    ).toEqual({
      id: 'legacy',
      subject: '学习',
      startedAt: 10,
      endedAt: 70,
      duration: 60_000,
      targetDuration: 3_600_000,
      status: 'completed',
      mode: 'focus',
      projectId: null
    });
  });

  it('rejects records without a complete numeric identity and time range', () => {
    expect(normalizeRecord({ id: 'broken', startedAt: 1, endedAt: 2 })).toBeNull();
    expect(
      normalizeRecord({
        id: 'broken-time',
        startedAt: Number.NaN,
        endedAt: 2,
        duration: 1
      })
    ).toBeNull();
  });

  it('persists and loads a project-linked study snapshot through the browser fallback', async () => {
    await expect(
      persistStudyData({
        sessions: [browserSession],
        projects: [DEFAULT_PROJECT, englishProject]
      })
    ).resolves.toEqual({ warning: null });

    expect(JSON.parse(localStorage.getItem('study-timer-sessions') ?? '{}')).toMatchObject({
      records: [expect.objectContaining({ projectId: englishProject.id })],
      projects: expect.arrayContaining([expect.objectContaining({ id: englishProject.id })])
    });
    await expect(loadStudyData()).resolves.toEqual({
      sessions: [browserSession],
      projects: [DEFAULT_PROJECT, englishProject],
      warning: null
    });
  });

  it('loads legacy browser arrays without assigning old records to a new project', async () => {
    localStorage.setItem(
      'study-timer-sessions',
      JSON.stringify([
        {
          id: 'legacy-browser',
          subject: '数学',
          startedAt: 1_000,
          endedAt: 61_000,
          duration: 60_000,
          targetDuration: 1_800_000,
          status: 'completed',
          mode: 'focus'
        }
      ])
    );

    await expect(loadStudyData()).resolves.toEqual({
      sessions: [
        expect.objectContaining({ id: 'legacy-browser', subject: '数学', projectId: null })
      ],
      projects: [DEFAULT_PROJECT],
      warning: null
    });
  });
});

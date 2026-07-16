import { beforeEach, describe, expect, it } from 'vitest';
import { useStatsStore } from '../src/stores/statsStore';
import { DEFAULT_PROJECT } from '../src/utils/projects';

beforeEach(() => {
  localStorage.clear();
  useStatsStore.setState({
    sessions: [],
    projects: [DEFAULT_PROJECT],
    todayTotal: 0,
    totalDuration: 0,
    currentStreak: 0,
    storageWarning: null,
    loaded: true
  });
});

describe('project data in the statistics store', () => {
  it('creates, edits, archives and restores a project without deleting sessions', async () => {
    const created = await useStatsStore
      .getState()
      .createProject({ name: '毕业设计', color: 'rose' });

    expect(created).toMatchObject({ name: '毕业设计', color: 'rose', archivedAt: null });
    expect(useStatsStore.getState().projects).toContainEqual(created);

    const updated = await useStatsStore
      .getState()
      .updateProject(created!.id, { name: '论文整理', color: 'violet' });

    expect(updated).toMatchObject({ id: created!.id, name: '论文整理', color: 'violet' });
    await expect(useStatsStore.getState().archiveProject(updated!.id)).resolves.toBe(true);
    expect(useStatsStore.getState().projects.find((project) => project.id === updated!.id)).toMatchObject(
      { archivedAt: expect.any(Number) }
    );
    await expect(useStatsStore.getState().restoreProject(updated!.id)).resolves.toBe(true);
    expect(useStatsStore.getState().projects.find((project) => project.id === updated!.id)).toMatchObject(
      { archivedAt: null }
    );
    await expect(useStatsStore.getState().archiveProject(DEFAULT_PROJECT.id)).resolves.toBe(false);
  });

  it('keeps projects when the session history is cleared', async () => {
    const project = await useStatsStore
      .getState()
      .createProject({ name: '英语阅读', color: 'cyan' });

    await useStatsStore.getState().addSession({
      subject: project!.name,
      projectId: project!.id,
      startedAt: 0,
      endedAt: 60_000,
      duration: 60_000,
      targetDuration: 60_000,
      status: 'completed',
      mode: 'focus'
    });
    await useStatsStore.getState().clearAllSessions();

    expect(useStatsStore.getState().sessions).toEqual([]);
    expect(useStatsStore.getState().projects).toContainEqual(project);
  });
});

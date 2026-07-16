import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTimerStore } from '../src/stores/timerStore';
import { useStatsStore } from '../src/stores/statsStore';
import type { StudyProject } from '../src/types';
import { DEFAULT_PROJECT } from '../src/utils/projects';

const writingProject: StudyProject = {
  id: 'project-writing',
  name: '论文写作',
  color: 'rose',
  createdAt: 0,
  archivedAt: null
};

afterEach(() => {
  useTimerStore.getState().reset();
  useStatsStore.setState({
    sessions: [],
    projects: [DEFAULT_PROJECT, writingProject],
    todayTotal: 0,
    totalDuration: 0,
    currentStreak: 0,
    storageWarning: null,
    loaded: true
  });
});

describe('timer store', () => {
  it('completes a timer that started at the Unix epoch and retains its duration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5_000);
    useTimerStore.setState({
      status: 'RUNNING',
      startedAt: 0,
      pausedAt: null,
      cumulativePausedDuration: 0,
      completedDuration: null,
      mode: 'focus',
      pomodoroPhase: null
    });

    await useTimerStore.getState().complete();

    expect(useTimerStore.getState()).toMatchObject({
      status: 'COMPLETED',
      startedAt: null,
      completedDuration: 5_000
    });
  });

  it('captures the selected project in a saved session and locks selection while active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    useStatsStore.setState({
      sessions: [],
      projects: [DEFAULT_PROJECT, writingProject],
      todayTotal: 0,
      totalDuration: 0,
      currentStreak: 0,
      storageWarning: null,
      loaded: true
    });

    useTimerStore.getState().setProject(writingProject);
    useTimerStore.getState().start();
    useTimerStore.getState().setProject(DEFAULT_PROJECT);

    expect(useTimerStore.getState()).toMatchObject({
      projectId: writingProject.id,
      subject: writingProject.name
    });

    vi.setSystemTime(61_000);
    await useTimerStore.getState().stop(true);

    const savedSession = useStatsStore.getState().sessions[
      useStatsStore.getState().sessions.length - 1
    ];

    expect(savedSession).toMatchObject({
      projectId: writingProject.id,
      subject: writingProject.name,
      duration: 61_000
    });
  });
});

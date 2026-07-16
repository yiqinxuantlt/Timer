import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectManagerModal from '../src/components/ProjectManagerModal';
import ProjectPicker from '../src/components/ProjectPicker';
import { useStatsStore } from '../src/stores/statsStore';
import { useTimerStore } from '../src/stores/timerStore';
import type { StudyProject } from '../src/types';
import { DEFAULT_PROJECT } from '../src/utils/projects';

const mathProject: StudyProject = {
  id: 'project-math',
  name: '数学复习',
  color: 'cyan',
  createdAt: 1,
  archivedAt: null
};

const archivedProject: StudyProject = {
  id: 'project-english',
  name: '英语阅读',
  color: 'violet',
  createdAt: 2,
  archivedAt: 3
};

beforeEach(() => {
  localStorage.clear();
  useStatsStore.setState({
    sessions: [],
    projects: [DEFAULT_PROJECT, mathProject, archivedProject],
    todayTotal: 0,
    totalDuration: 0,
    currentStreak: 0,
    storageWarning: null,
    loaded: true
  });
  useTimerStore.setState({
    status: 'IDLE',
    subject: DEFAULT_PROJECT.name,
    projectId: DEFAULT_PROJECT.id,
    pomodoroWaitingForConfirmation: false
  });
});

describe('project interactions', () => {
  it('selects active projects, creates a project, and blocks duplicate names', async () => {
    render(<ProjectPicker disabled={false} onManage={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '选择项目' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: mathProject.name }));
    expect(useTimerStore.getState().projectId).toBe(mathProject.id);

    fireEvent.click(screen.getByRole('button', { name: '选择项目' }));
    fireEvent.click(screen.getByRole('button', { name: '新建项目' }));
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '毕业设计' } });
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }));

    await waitFor(() => expect(useTimerStore.getState().subject).toBe('毕业设计'));
    expect(useStatsStore.getState().projects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '毕业设计' })])
    );

    fireEvent.click(screen.getByRole('button', { name: '选择项目' }));
    fireEvent.click(screen.getByRole('button', { name: '新建项目' }));
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '数学复习' } });
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('项目名称已存在')
    );
  });

  it('disables the project picker while the timer is active', () => {
    render(<ProjectPicker disabled onManage={vi.fn()} />);

    expect(screen.getByRole('button', { name: '选择项目' })).toBeDisabled();
  });

  it('keeps the default project out of archive actions and restores archived projects', async () => {
    render(<ProjectManagerModal isOpen onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: `归档 ${DEFAULT_PROJECT.name}` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `恢复 ${archivedProject.name}` }));

    await waitFor(() =>
      expect(useStatsStore.getState().projects.find((project) => project.id === archivedProject.id))
        .toMatchObject({ archivedAt: null })
    );
  });
});

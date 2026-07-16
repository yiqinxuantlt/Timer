import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContextMenu from '../src/components/ContextMenu';
import HistoryModal from '../src/components/HistoryModal';
import SettingsPanel from '../src/components/SettingsPanel';
import TitleBar from '../src/components/TitleBar';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useTimerStore } from '../src/stores/timerStore';
import type { FocusSession } from '../src/types';

const session: FocusSession = {
  id: 'dialog-session',
  subject: '数学',
  startedAt: new Date(2026, 0, 5, 9).getTime(),
  endedAt: new Date(2026, 0, 5, 10).getTime(),
  duration: 3_600_000,
  targetDuration: 3_600_000,
  status: 'completed',
  mode: 'focus'
};

let clearAllSessions = vi.fn();

function HistoryHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>打开历史</button>
      <HistoryModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function SettingsHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>打开设置</button>
      <SettingsPanel inTauri={false} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

beforeEach(() => {
  clearAllSessions = vi.fn().mockResolvedValue(undefined);
  useStatsStore.setState({
    sessions: [session],
    todayTotal: session.duration,
    totalDuration: session.duration,
    currentStreak: 1,
    storageWarning: null,
    loaded: true,
    clearAllSessions
  });
  useSettingsStore.setState({ compactMode: false, recentSubjects: [] });
  useTimerStore.setState({ status: 'IDLE', subject: '学习' });
});

describe('dialog accessibility and browser fallback', () => {
  it('traps focus in history and restores it after Escape closes the dialog', () => {
    render(<HistoryHarness />);
    const trigger = screen.getByRole('button', { name: '打开历史' });
    trigger.focus();

    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: '历史记录' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('clear-history')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('resets a pending clear confirmation when history is closed', async () => {
    render(<HistoryHarness />);
    const trigger = screen.getByRole('button', { name: '打开历史' });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('clear-history'));
    expect(clearAllSessions).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('clear-history'));
    expect(clearAllSessions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('clear-history'));
    await waitFor(() => expect(clearAllSessions).toHaveBeenCalledTimes(1));
  });

  it('keeps browser-capable settings while hiding desktop-only controls', () => {
    render(<SettingsHarness />);
    const trigger = screen.getByRole('button', { name: '打开设置' });
    trigger.focus();

    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: '设置' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('目标时长')).toBeVisible();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/浏览器预览支持计时/)).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it('keeps title actions usable in browser preview and omits native controls', () => {
    const openSettings = vi.fn();
    const openHistory = vi.fn();
    render(<TitleBar inTauri={false} onOpenSettings={openSettings} onOpenHistory={openHistory} />);

    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '历史记录' }));
    fireEvent.click(screen.getByRole('button', { name: '编辑科目' }));

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(openHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '编辑科目...' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '最小化' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '关闭' })).not.toBeInTheDocument();
  });

  it('hides the always-on-top action from the browser context menu', () => {
    render(
      <ContextMenu
        inTauri={false}
        x={0}
        y={0}
        onClose={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /置顶窗口/ })).not.toBeInTheDocument();
  });
});

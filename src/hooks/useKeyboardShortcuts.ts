import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';

const SHORTCUTS = {
  playPause: 'Ctrl+Alt+Space',
  stop: 'Ctrl+Alt+S',
} as const;

export function useKeyboardShortcuts(inTauri: boolean): void {
  const enabled = useSettingsStore((state) => state.globalShortcutsEnabled);

  useEffect(() => {
    if (!inTauri || !enabled) return;

    let disposed = false;
    const registered: string[] = [];

    const registerShortcuts = async () => {
      try {
        const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');

        await register(SHORTCUTS.playPause, () => {
          const timer = useTimerStore.getState();
          if (timer.status === 'IDLE' || timer.status === 'COMPLETED') timer.start();
          else if (timer.status === 'RUNNING') timer.pause();
          else if (timer.status === 'PAUSED') timer.resume();
        });
        registered.push(SHORTCUTS.playPause);

        await register(SHORTCUTS.stop, () => {
          const timer = useTimerStore.getState();
          if (timer.status === 'RUNNING' || timer.status === 'PAUSED') void timer.stop(true);
        });
        registered.push(SHORTCUTS.stop);

        if (disposed) {
          await Promise.all(registered.map((shortcut) => unregister(shortcut)));
        }
      } catch (error) {
        console.error('Failed to register global shortcuts:', error);
      }
    };

    void registerShortcuts();

    return () => {
      disposed = true;
      void import('@tauri-apps/plugin-global-shortcut').then(({ unregister }) =>
        Promise.all(registered.map((shortcut) => unregister(shortcut)))
      );
    };
  }, [enabled, inTauri]);
}

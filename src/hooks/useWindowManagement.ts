import { useEffect, useState } from 'react';
import { isTauri } from '../lib/platform';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import {
  getAppWindow,
  resizeWindow,
  setWindowAlwaysOnTop,
} from '../services/windowService';

export function useWindowManagement(): boolean {
  const [inTauri, setInTauri] = useState(false);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const compactMode = useSettingsStore((state) => state.compactMode);

  useEffect(() => {
    void isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  useEffect(() => {
    if (!inTauri) return;
    void setWindowAlwaysOnTop(alwaysOnTop).catch((error) => {
      console.error('Failed to update always-on-top state:', error);
    });
  }, [alwaysOnTop, inTauri]);

  useEffect(() => {
    if (!inTauri) return;
    void resizeWindow(compactMode).catch((error) => {
      console.error('Failed to resize study timer window:', error);
    });
  }, [compactMode, inTauri]);

  useEffect(() => {
    if (!inTauri) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    const setupCloseHandler = async () => {
      try {
        const appWindow = await getAppWindow();
        if (disposed) return;

        unlisten = await appWindow.onCloseRequested(async (event) => {
          const timer = useTimerStore.getState();
          if ((timer.status === 'RUNNING' || timer.status === 'PAUSED') && timer.startedAt) {
            event.preventDefault();
            await timer.stop(true);
            await appWindow.destroy();
          }
        });
      } catch (error) {
        console.error('Failed to register window close handler:', error);
      }
    };

    void setupCloseHandler();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [inTauri]);

  return inTauri;
}

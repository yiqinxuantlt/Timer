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
    let closeInProgress = false;
    let unlisten: (() => void) | null = null;

    const setupCloseHandler = async () => {
      try {
        const appWindow = await getAppWindow();
        if (disposed) return;

        unlisten = await appWindow.onCloseRequested(async (event) => {
          if (closeInProgress) return;

          const timer = useTimerStore.getState();
          if ((timer.status === 'RUNNING' || timer.status === 'PAUSED') && timer.startedAt) {
            event.preventDefault();
            closeInProgress = true;

            try {
              await timer.stop(true);
            } catch (error) {
              console.error('Failed to save the active session before closing:', error);
            }

            try {
              await appWindow.destroy();
            } catch (error) {
              console.error('Failed to destroy the window after close request:', error);

              // If destroy is unavailable on an older build, allow a second close
              // request to fall through instead of trapping the window forever.
              try {
                await appWindow.close();
              } catch (fallbackError) {
                console.error('Failed to close the window after destroy failed:', fallbackError);
              }
            }
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

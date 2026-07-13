import { memo } from 'react';
import { Minus, X } from 'lucide-react';
import styles from './TitleBar.module.css';

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

async function getAppWindow() {
  if (!isTauri) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

function TitleBar() {
  const handleMinimize = async () => {
    const appWindow = await getAppWindow();
    if (appWindow) {
      await appWindow.minimize();
    }
  };

  const handleClose = async () => {
    const appWindow = await getAppWindow();
    if (appWindow) {
      await appWindow.close();
    }
  };

  // Only show title bar in Tauri environment
  if (!isTauri) return null;

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.left} data-tauri-drag-region>
        <span className={styles.label} data-tauri-drag-region>
          focus
        </span>
      </div>
      <div className={styles.controls}>
        <button
          className={styles.button}
          onClick={handleMinimize}
          aria-label="最小化"
        >
          <Minus size={12} />
        </button>
        <button
          className={`${styles.button} ${styles.closeButton}`}
          onClick={handleClose}
          aria-label="关闭"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default memo(TitleBar);
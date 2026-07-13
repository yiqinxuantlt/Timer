import { memo, useEffect, useState } from 'react';
import { Minus, X } from 'lucide-react';
import { isTauri } from '../lib/platform';
import styles from './TitleBar.module.css';

function TitleBar() {
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    isTauri().then(setInTauri).catch(() => setInTauri(false));
  }, []);

  const handleMinimize = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  if (!inTauri) return null;

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
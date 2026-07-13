import { memo, useEffect, useState } from 'react';
import { Minus, X, Pin, Settings } from 'lucide-react';
import { isTauri } from '../lib/platform';
import { useSettingsStore } from '../stores/settingsStore';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  onOpenSettings?: () => void;
}

function TitleBar({ onOpenSettings }: TitleBarProps) {
  const [inTauri, setInTauri] = useState(false);
  const { alwaysOnTop, toggleAlwaysOnTop } = useSettingsStore();

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
          专注计时
        </span>
      </div>
      <div className={styles.controls}>
        <button
          className={`${styles.button} ${alwaysOnTop ? styles.buttonActive : ''}`}
          onClick={toggleAlwaysOnTop}
          aria-label={alwaysOnTop ? '取消置顶' : '置顶'}
          title={alwaysOnTop ? '取消置顶' : '置顶'}
        >
          <Pin size={12} />
        </button>
        {onOpenSettings && (
          <button
            className={styles.button}
            onClick={onOpenSettings}
            aria-label="设置"
            title="设置"
          >
            <Settings size={12} />
          </button>
        )}
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
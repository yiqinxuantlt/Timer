import { memo } from 'react';
import { History, Minus, Pin, Settings, X } from 'lucide-react';
import { closeWindow, minimizeWindow } from '../services/windowService';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import ProjectPicker from './ProjectPicker';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  inTauri: boolean;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onOpenProjectManager?: () => void;
}

const noop = () => undefined;

function TitleBar({
  inTauri,
  onOpenSettings,
  onOpenHistory,
  onOpenProjectManager
}: TitleBarProps) {
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const toggleAlwaysOnTop = useSettingsStore((state) => state.toggleAlwaysOnTop);
  const status = useTimerStore((state) => state.status);
  const pomodoroWaitingForConfirmation = useTimerStore(
    (state) => state.pomodoroWaitingForConfirmation
  );

  const handleMinimize = async () => {
    if (!inTauri) return;
    await minimizeWindow();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    await closeWindow();
  };

  const projectLocked =
    status === 'RUNNING' || status === 'PAUSED' || pomodoroWaitingForConfirmation;

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.left} data-tauri-drag-region>
        <ProjectPicker
          disabled={projectLocked}
          onManage={onOpenProjectManager ?? noop}
        />
      </div>

      <div className={styles.controls}>
        {inTauri && (
          <button
            className={styles.button + (alwaysOnTop ? ' ' + styles.buttonActive : '')}
            onClick={toggleAlwaysOnTop}
            aria-label={alwaysOnTop ? '取消置顶' : '置顶'}
            title={alwaysOnTop ? '取消置顶' : '置顶'}
          >
            <Pin size={12} />
          </button>
        )}
        {onOpenSettings && (
          <button className={styles.button} onClick={onOpenSettings} aria-label="设置" title="设置">
            <Settings size={12} />
          </button>
        )}
        {onOpenHistory && (
          <button
            className={styles.button}
            onClick={onOpenHistory}
            aria-label="统计与记录"
            title="统计与记录"
          >
            <History size={12} />
          </button>
        )}
        {inTauri && (
          <>
            <button className={styles.button} onClick={handleMinimize} aria-label="最小化">
              <Minus size={12} />
            </button>
            <button
              className={styles.button + ' ' + styles.closeButton}
              onClick={handleClose}
              aria-label="关闭"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(TitleBar);


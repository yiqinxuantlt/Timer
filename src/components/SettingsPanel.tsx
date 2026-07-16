import { memo } from 'react';
import { X, Bell, Timer, Layers, Coffee, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { label: '15 分钟', value: 15 * 60 * 1000 },
  { label: '30 分钟', value: 30 * 60 * 1000 },
  { label: '45 分钟', value: 45 * 60 * 1000 },
  { label: '1 小时', value: 60 * 60 * 1000 },
  { label: '1.5 小时', value: 90 * 60 * 1000 },
  { label: '2 小时', value: 120 * 60 * 1000 }
];

function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const defaultTargetDuration = useSettingsStore((state) => state.defaultTargetDuration);
  const setDefaultTargetDuration = useSettingsStore((state) => state.setDefaultTargetDuration);
  const pomodoroConfig = useSettingsStore((state) => state.pomodoroConfig);
  const setPomodoroConfig = useSettingsStore((state) => state.setPomodoroConfig);
  const resetPomodoroConfig = useSettingsStore((state) => state.resetPomodoroConfig);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const toggleAlwaysOnTop = useSettingsStore((state) => state.toggleAlwaysOnTop);
  const notificationEnabled = useSettingsStore((state) => state.notificationEnabled);
  const toggleNotification = useSettingsStore((state) => state.toggleNotification);
  const globalShortcutsEnabled = useSettingsStore((state) => state.globalShortcutsEnabled);
  const toggleGlobalShortcuts = useSettingsStore((state) => state.toggleGlobalShortcuts);
  const timerStatus = useTimerStore((state) => state.status);
  const pomodoroWaitingForConfirmation = useTimerStore(
    (state) => state.pomodoroWaitingForConfirmation
  );
  const isTimerActive =
    timerStatus === 'RUNNING' || timerStatus === 'PAUSED' || pomodoroWaitingForConfirmation;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>设置</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭设置">
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 目标时长 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Timer size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>目标时长</span>
            </div>
            <div className={styles.durationGrid}>
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.durationButton} ${defaultTargetDuration === opt.value ? styles.durationButtonActive : ''}`}
                  onClick={() => setDefaultTargetDuration(opt.value)}
                  disabled={isTimerActive}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 番茄钟设置 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Coffee size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>番茄钟</span>
            </div>
            <div className={styles.pomodoroGrid}>
              <label className={styles.numberField}>
                <span>专注（分钟）</span>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={180}
                  step={1}
                  value={pomodoroConfig.focusDuration / 60_000}
                  onChange={(event) =>
                    setPomodoroConfig({
                      focusDuration: Number(event.target.value) * 60_000
                    })
                  }
                  disabled={isTimerActive}
                  aria-label="番茄钟专注时长"
                />
              </label>
              <label className={styles.numberField}>
                <span>短休息（分钟）</span>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={pomodoroConfig.shortBreakDuration / 60_000}
                  onChange={(event) =>
                    setPomodoroConfig({
                      shortBreakDuration: Number(event.target.value) * 60_000
                    })
                  }
                  disabled={isTimerActive}
                  aria-label="番茄钟短休息时长"
                />
              </label>
              <label className={styles.numberField}>
                <span>长休息（分钟）</span>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={pomodoroConfig.longBreakDuration / 60_000}
                  onChange={(event) =>
                    setPomodoroConfig({
                      longBreakDuration: Number(event.target.value) * 60_000
                    })
                  }
                  disabled={isTimerActive}
                  aria-label="番茄钟长休息时长"
                />
              </label>
              <label className={styles.numberField}>
                <span>长休息间隔（轮）</span>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={pomodoroConfig.cyclesBeforeLongBreak}
                  onChange={(event) =>
                    setPomodoroConfig({
                      cyclesBeforeLongBreak: Number(event.target.value)
                    })
                  }
                  disabled={isTimerActive}
                  aria-label="番茄钟长休息间隔"
                />
              </label>
            </div>
            <span className={styles.toggleHint}>
              经典设置：25 分钟专注 / 5 分钟短休息 / 15 分钟长休息，每 4 轮一次。
            </span>
            <button
              type="button"
              className={styles.resetButton}
              onClick={resetPomodoroConfig}
              disabled={isTimerActive}
            >
              <RotateCcw size={13} />
              恢复经典设置
            </button>
          </div>

          {/* 窗口设置 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Layers size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>窗口</span>
            </div>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>窗口置顶</span>
                  <span className={styles.toggleHint}>保持在其他窗口之上</span>
                </div>
                <button
                  className={`${styles.toggle} ${alwaysOnTop ? styles.toggleActive : ''}`}
                  onClick={toggleAlwaysOnTop}
                  role="switch"
                  aria-checked={alwaysOnTop}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
            </div>
          </div>

          {/* 通知与快捷键 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Bell size={14} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>通知与快捷键</span>
            </div>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>桌面通知</span>
                  <span className={styles.toggleHint}>完成时发送通知</span>
                </div>
                <button
                  className={`${styles.toggle} ${notificationEnabled ? styles.toggleActive : ''}`}
                  onClick={toggleNotification}
                  role="switch"
                  aria-checked={notificationEnabled}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>全局快捷键</span>
                  <span className={styles.toggleHint}>
                    Ctrl+Alt+Space 播放/暂停，Ctrl+Alt+S 停止
                  </span>
                </div>
                <button
                  className={`${styles.toggle} ${globalShortcutsEnabled ? styles.toggleActive : ''}`}
                  onClick={toggleGlobalShortcuts}
                  role="switch"
                  aria-checked={globalShortcutsEnabled}
                >
                  <span className={styles.toggleSwitch} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsPanel);

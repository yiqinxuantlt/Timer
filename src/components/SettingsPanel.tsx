import { memo } from 'react';
import { X, Bell, Timer, Layers } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
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
  { label: '2 小时', value: 120 * 60 * 1000 },
];

function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    targetDuration,
    setTargetDuration,
    alwaysOnTop,
    toggleAlwaysOnTop,
    notificationEnabled,
    toggleNotification,
    globalShortcutsEnabled,
    toggleGlobalShortcuts,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>设置</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭设置"
          >
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
                  className={`${styles.durationButton} ${targetDuration === opt.value ? styles.durationButtonActive : ''}`}
                  onClick={() => setTargetDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
                  <span className={styles.toggleHint}>Ctrl+Alt+Space 播放/暂停，Ctrl+Alt+S 停止</span>
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
import { memo, useEffect, useRef } from 'react';
import { History, Settings, Pin, Info, Minimize2 } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  inTauri: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

function ContextMenu({ inTauri, x, y, onClose, onOpenHistory, onOpenSettings }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const compactMode = useSettingsStore((state) => state.compactMode);
  const toggleAlwaysOnTop = useSettingsStore((state) => state.toggleAlwaysOnTop);
  const toggleCompactMode = useSettingsStore((state) => state.toggleCompactMode);

  // 调整位置防止溢出窗口
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > windowWidth - 8) {
      adjustedX = windowWidth - rect.width - 8;
    }
    if (y + rect.height > windowHeight - 8) {
      adjustedY = windowHeight - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [x, y]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleHistory = () => {
    onOpenHistory();
    onClose();
  };

  const handleSettings = () => {
    onOpenSettings();
    onClose();
  };

  const handlePin = () => {
    toggleAlwaysOnTop();
    onClose();
  };

  const handleCompactMode = () => {
    toggleCompactMode();
    onClose();
  };

  const handleAbout = () => {
    alert('学习计时器 v1.0\n\n专注学习，高效管理时间');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={menuRef}
        className={styles.menu}
        onClick={(e) => e.stopPropagation()}
        style={{ left: x, top: y }}
      >
        <button className={styles.item} onClick={handleHistory}>
          <History size={14} />
          <span>历史记录</span>
        </button>
        <button className={styles.item} onClick={handleSettings}>
          <Settings size={14} />
          <span>设置</span>
        </button>
        {inTauri && (
          <button className={styles.item} onClick={handlePin}>
            <Pin size={14} />
            <span>置顶窗口</span>
            {alwaysOnTop && <span className={styles.check}>✓</span>}
          </button>
        )}
        <button className={styles.item} onClick={handleCompactMode}>
          <Minimize2 size={14} />
          <span>紧凑模式</span>
          {compactMode && <span className={styles.check}>✓</span>}
        </button>
        <div className={styles.divider} />
        <button className={styles.item} onClick={handleAbout}>
          <Info size={14} />
          <span>关于</span>
        </button>
      </div>
    </div>
  );
}

export default memo(ContextMenu);

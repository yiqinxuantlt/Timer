import { memo, useEffect, useRef, useState } from 'react';
import { Minus, X, Pin, Settings, History, ChevronDown } from 'lucide-react';
import { closeWindow, minimizeWindow } from '../services/windowService';
import { useSettingsStore } from '../stores/settingsStore';
import { useTimerStore } from '../stores/timerStore';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  inTauri: boolean;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
}

function TitleBar({ inTauri, onOpenSettings, onOpenHistory }: TitleBarProps) {
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const toggleAlwaysOnTop = useSettingsStore((state) => state.toggleAlwaysOnTop);
  const recentSubjects = useSettingsStore((state) => state.recentSubjects);
  const addRecentSubject = useSettingsStore((state) => state.addRecentSubject);
  const subject = useTimerStore((state) => state.subject);
  const setSubject = useTimerStore((state) => state.setSubject);
  const status = useTimerStore((state) => state.status);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subject);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 同步 subject 到编辑框
  useEffect(() => {
    setEditValue(subject);
  }, [subject]);

  // 编辑模式下自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleMinimize = async () => {
    if (!inTauri) return;
    await minimizeWindow();
  };

  const handleClose = async () => {
    if (!inTauri) return;
    await closeWindow();
  };

  const isRunning = status === 'RUNNING' || status === 'PAUSED';

  const handleSubjectClick = () => {
    if (isRunning) return; // 计时中禁止编辑
    setShowDropdown((prev) => !prev);
  };

  const handleSubjectBlur = () => {
    const trimmed = editValue.trim() || '学习';
    if (trimmed !== subject) {
      setSubject(trimmed);
      addRecentSubject(trimmed);
    }
    setEditValue(trimmed);
    setIsEditing(false);
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(subject);
      setIsEditing(false);
    }
  };

  const handleSelectRecent = (s: string) => {
    setSubject(s);
    setEditValue(s);
    addRecentSubject(s);
    setShowDropdown(false);
  };

  const handleStartEdit = () => {
    setShowDropdown(false);
    setIsEditing(true);
  };

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.left} data-tauri-drag-region>
        <div className={styles.subjectWrapper} ref={dropdownRef}>
          {isEditing ? (
            <input
              ref={inputRef}
              className={styles.subjectInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSubjectBlur}
              onKeyDown={handleSubjectKeyDown}
              placeholder="输入科目"
              maxLength={20}
            />
          ) : (
            <button
              className={`${styles.subjectButton} ${isRunning ? styles.subjectButtonDisabled : ''}`}
              onClick={handleSubjectClick}
              disabled={isRunning}
              aria-label="编辑科目"
            >
              <span className={styles.subjectText}>{subject}</span>
              {!isRunning && <ChevronDown size={10} className={styles.dropdownArrow} />}
            </button>
          )}

          {/* 最近科目下拉 */}
          {showDropdown && !isEditing && (
            <div className={styles.dropdown}>
              {recentSubjects.map((s) => (
                <button
                  key={s}
                  className={styles.dropdownItem}
                  onClick={() => handleSelectRecent(s)}
                >
                  {s}
                </button>
              ))}
              <button className={styles.dropdownItem} onClick={handleStartEdit}>
                编辑科目...
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        {inTauri && (
          <button
            className={`${styles.button} ${alwaysOnTop ? styles.buttonActive : ''}`}
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
            aria-label="历史记录"
            title="历史记录"
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
              className={`${styles.button} ${styles.closeButton}`}
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

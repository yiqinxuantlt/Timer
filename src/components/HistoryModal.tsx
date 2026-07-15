import { memo, useMemo, useState } from 'react';
import { Clock, Download, Flame, Trash2, X } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../utils/format';
import type { FocusSession } from '../types';
import styles from './HistoryModal.module.css';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedSessions {
  date: string;
  sessions: FocusSession[];
  totalMs: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const sessions = useStatsStore((state) => state.sessions);
  const todayTotal = useStatsStore((state) => state.todayTotal);
  const totalDuration = useStatsStore((state) => state.totalDuration);
  const currentStreak = useStatsStore((state) => state.currentStreak);
  const deleteSession = useStatsStore((state) => state.deleteSession);
  const clearAllSessions = useStatsStore((state) => state.clearAllSessions);

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
    const groups = new Map<string, FocusSession[]>();

    sorted.forEach((session) => {
      const date = formatDate(session.startedAt);
      const group = groups.get(date) ?? [];
      group.push(session);
      groups.set(date, group);
    });

    return Array.from(groups, ([date, group]): GroupedSessions => ({
      date,
      sessions: group,
      totalMs: group.reduce((total, session) => total + session.duration, 0),
    }));
  }, [sessions]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (showClearConfirm) {
      void clearAllSessions();
      setShowClearConfirm(false);
      return;
    }
    setShowClearConfirm(true);
  };

  const handleExport = () => {
    const data = sessions.map((session) => ({
      id: session.id,
      subject: session.subject,
      status: session.status,
      startedAt: new Date(session.startedAt).toISOString(),
      endedAt: new Date(session.endedAt).toISOString(),
      durationSeconds: Math.floor(session.duration / 1000),
      durationFormatted: formatDuration(session.duration),
      targetDurationSeconds: Math.floor(session.targetDuration / 1000),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-timer-records-${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>FOCUS LOG</span>
            <h2 className={styles.title}>历史记录</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <Clock size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>今日</span>
            <span className={styles.statValue}>{formatDuration(todayTotal)}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Clock size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>累计</span>
            <span className={styles.statValue}>{formatDuration(totalDuration)}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Flame size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>连续</span>
            <span className={styles.statValue}>{currentStreak > 0 ? `${currentStreak} 天` : '-'}</span>
          </div>
        </div>

        <div className={styles.content}>
          {groupedSessions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>◌</div>
              <span className={styles.emptyText}>开始你的第一次专注</span>
              <span className={styles.emptyHint}>有效完成的记录会显示在这里</span>
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {groupedSessions.map((group) => (
                  <section key={group.date} className={styles.group}>
                    <div className={styles.groupHeader}>
                      <span className={styles.groupDate}>{group.date}</span>
                      <span className={styles.groupTotal}>{formatDuration(group.totalMs)}</span>
                    </div>
                    {group.sessions.map((session, index) => (
                      <div
                        key={session.id}
                        className={styles.item}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className={styles.itemLeft}>
                          <span className={styles.time}>{formatTime(session.startedAt)}</span>
                          <span className={styles.subject}>{session.subject || '未命名'}</span>
                        </div>
                        <div className={styles.itemRight}>
                          <span className={styles.duration}>{formatDuration(session.duration)}</span>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => void deleteSession(session.id)}
                            title="删除此记录"
                            aria-label="删除记录"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </div>

              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={handleExport} title="导出 JSON">
                  <Download size={12} />
                  <span>导出 JSON</span>
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={handleClearAll}
                >
                  {showClearConfirm ? '确认清空？' : '清空所有'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(HistoryModal);

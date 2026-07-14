import { memo, useState } from 'react';
import { X, Trash2, Download, Clock, Flame } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
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

function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { sessions, todayTotal, currentStreak, deleteSession, clearAllSessions } = useStatsStore();

  if (!isOpen) return null;

  // Sort sessions by end time, most recent first
  const sortedSessions = [...sessions].sort((a, b) => b.endedAt - a.endedAt);

  // Group sessions by date
  const groupedSessions: GroupedSessions[] = [];
  const dateGroups = new Map<string, typeof sessions>();

  for (const session of sortedSessions) {
    const dateKey = new Date(session.endedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(session);
  }

  for (const [date, dateSessions] of dateGroups) {
    groupedSessions.push({
      date,
      sessions: dateSessions,
      totalMs: dateSessions.reduce((sum, s) => sum + s.duration, 0),
    });
  }

  const handleDelete = (id: string) => {
    deleteSession(id);
  };

  const handleClearAll = () => {
    if (showClearConfirm) {
      clearAllSessions();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleExport = () => {
    const data = sessions.map(s => ({
      id: s.id,
      subject: s.subject,
      startedAt: new Date(s.startedAt).toISOString(),
      endedAt: new Date(s.endedAt).toISOString(),
      durationSeconds: Math.floor(s.duration / 1000),
      durationFormatted: formatDuration(s.duration),
      targetDurationSeconds: Math.floor(s.targetDuration / 1000),
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-timer-records-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayDuration = formatDuration(todayTotal);
  const streakText = currentStreak > 0 ? `${currentStreak} 天` : '-';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>📜 历史记录</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <Clock size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>今日专注</span>
            <span className={styles.statValue}>{todayDuration}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <Flame size={14} className={styles.statIcon} />
            <span className={styles.statLabel}>连续</span>
            <span className={styles.statValue}>{streakText}</span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {sortedSessions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📭</div>
              <span className={styles.emptyText}>开始你的第一次专注</span>
              <span className={styles.emptyHint}>完成的记录会显示在这里</span>
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {groupedSessions.map((group) => (
                  <div key={group.date} className={styles.group}>
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
                          <span className={styles.time}>
                            {formatTime(session.endedAt)}
                          </span>
                          <span className={styles.subject}>
                            {session.subject || '未命名'}
                          </span>
                        </div>
                        <div className={styles.itemRight}>
                          <span className={styles.duration}>
                            {formatDuration(session.duration)}
                          </span>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(session.id)}
                            title="删除此记录"
                            aria-label="删除记录"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={handleExport}
                  title="导出 JSON"
                >
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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default memo(HistoryModal);

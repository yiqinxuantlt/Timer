import { memo, useState } from 'react';
import { ChevronDown, Trash2, Download, X } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import type { FocusSession } from '../types';
import styles from './HistoryPanel.module.css';

interface GroupedSessions {
  date: string;
  sessions: FocusSession[];
  totalMs: number;
}

function HistoryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { sessions, deleteSession, clearAllSessions } = useStatsStore();

  const toggleOpen = () => setIsOpen(!isOpen);

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

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label="展开历史记录"
      >
        <span>历史记录 ({sessions.length})</span>
        <ChevronDown
          size={14}
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
        />
      </button>

      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        {sortedSessions.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className={styles.emptyText}>开始你的第一次专注</span>
            <span className={styles.emptyHint}>完成的记录会显示在这里</span>
          </div>
        ) : (
          <>
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={handleExport}
                title="导出 JSON"
              >
                <Download size={12} />
                <span>导出</span>
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={handleClearAll}
              >
                {showClearConfirm ? (
                  <>
                    <X size={12} />
                    <span>确认清空？</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    <span>清空</span>
                  </>
                )}
              </button>
            </div>

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
                        <span className={styles.date}>
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
          </>
        )}
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

export default memo(HistoryPanel);
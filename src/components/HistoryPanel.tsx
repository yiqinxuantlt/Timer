import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import styles from './HistoryPanel.module.css';

function HistoryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { sessions } = useStatsStore();

  const toggleOpen = () => setIsOpen(!isOpen);

  // Sort sessions by end time, most recent first
  const sortedSessions = [...sessions].sort((a, b) => b.endedAt - a.endedAt);

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label="展开历史记录"
      >
        <span>history</span>
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
          <div className={styles.list}>
            {sortedSessions.map((session, index) => (
              <div 
                key={session.id} 
                className={styles.item}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className={styles.itemLeft}>
                  <span className={styles.date}>
                    {formatDate(session.endedAt)}
                  </span>
                  <span className={styles.subject}>
                    {session.subject || 'untitled'}
                  </span>
                </div>
                <span className={styles.duration}>
                  {formatDuration(session.duration)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default memo(HistoryPanel);
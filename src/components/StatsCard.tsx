import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import styles from './StatsCard.module.css';

function StatsCard() {
  const { todayTotal, currentStreak } = useStatsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const todayDuration = formatDuration(todayTotal);
  const streakText = currentStreak > 0 ? `${currentStreak} 天` : '-';

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="展开统计信息"
      >
        <div className={styles.toggleItem}>
          <span className={styles.toggleLabel}>今日专注</span>
          <span className={styles.toggleValue}>{todayDuration}</span>
        </div>
        <ChevronDown
          size={12}
          className={`${styles.toggleIcon} ${isExpanded ? styles.toggleIconOpen : ''}`}
        />
      </button>

      <div className={`${styles.panel} ${isExpanded ? styles.panelOpen : ''}`}>
        <div className={styles.item}>
          <span className={styles.label}>连续天数</span>
          <span className={styles.value}>{streakText}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(StatsCard);
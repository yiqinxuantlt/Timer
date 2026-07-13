import { memo } from 'react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../stores/timerStore';
import styles from './StatsCard.module.css';

function StatsCard() {
  const { todayTotal, currentStreak } = useStatsStore();

  const todayDuration = formatDuration(todayTotal);
  const streakText = currentStreak > 0 ? `${currentStreak} 天` : '-';

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <span className={styles.label}>today</span>
        <span className={styles.value}>{todayDuration}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>
        <span className={styles.label}>streak</span>
        <span className={styles.value}>{streakText}</span>
      </div>
    </div>
  );
}

export default memo(StatsCard);
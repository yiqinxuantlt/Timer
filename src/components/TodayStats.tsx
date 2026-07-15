import { memo } from 'react';
import { useStatsStore } from '../stores/statsStore';
import { formatDuration } from '../utils/format';
import styles from './TodayStats.module.css';

function TodayStats() {
  const todayTotal = useStatsStore((s) => s.todayTotal);
  const duration = formatDuration(todayTotal);

  return (
    <div className={styles.container}>
      <span className={styles.label}>今日专注</span>
      <span className={styles.value}>{duration}</span>
    </div>
  );
}

export default memo(TodayStats);

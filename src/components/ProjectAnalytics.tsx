import { memo, type CSSProperties } from 'react';
import type { DailyFocusTotal, ProjectSummary } from '../types';
import { formatDuration } from '../utils/format';
import { getProjectColorValue } from '../utils/projects';
import styles from './ProjectAnalytics.module.css';

interface ProjectAnalyticsProps {
  dailyTotals: DailyFocusTotal[];
  summaries: ProjectSummary[];
}

function getDayLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', { weekday: 'short' });
}

function ProjectAnalytics({ dailyTotals, summaries }: ProjectAnalyticsProps) {
  const maxDailyDuration = Math.max(...dailyTotals.map((item) => item.duration), 0);

  return (
    <div className={styles.container}>
      <section className={styles.section} aria-labelledby="weekly-focus-title">
        <div className={styles.sectionHeader}>
          <h3 id="weekly-focus-title" className={styles.sectionTitle}>
            最近 7 天
          </h3>
          <span className={styles.sectionHint}>按开始日期归属</span>
        </div>
        <div className={styles.dailyChart} aria-label="最近七天专注时长">
          {dailyTotals.map((item) => {
            const height =
              maxDailyDuration > 0 ? Math.max(4, Math.round((item.duration / maxDailyDuration) * 100)) : 0;
            const barStyle = {
              '--bar-height': String(height) + '%'
            } as CSSProperties;
            return (
              <div key={item.date} className={styles.dayColumn}>
                <span className={styles.dayValue}>{formatDuration(item.duration)}</span>
                <div className={styles.barTrack} aria-label={item.date + ' ' + formatDuration(item.duration)}>
                  <span className={styles.barFill} style={barStyle} />
                </div>
                <span className={styles.dayLabel}>{getDayLabel(item.date)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="project-investment-title">
        <div className={styles.sectionHeader}>
          <h3 id="project-investment-title" className={styles.sectionTitle}>
            项目投入
          </h3>
          <span className={styles.sectionHint}>仅计入有效会话</span>
        </div>
        {summaries.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyMark}>◌</span>
            <span>完成一次不少于 1 分钟的专注后，这里会显示项目投入。</span>
          </div>
        ) : (
          <div className={styles.projectList}>
            {summaries.map((summary) => {
              const percent = Math.round(summary.share * 100);
              const projectStyle = {
                '--project-color': getProjectColorValue(summary.color),
                '--share-width': String(percent) + '%'
              } as CSSProperties;
              return (
                <article key={summary.key} className={styles.projectCard} style={projectStyle}>
                  <div className={styles.projectTopline}>
                    <span className={styles.projectDot} aria-hidden="true" />
                    <div className={styles.projectTitle}>
                      <span className={styles.projectName}>{summary.name}</span>
                      {summary.isLegacy && <span className={styles.legacyBadge}>历史项目</span>}
                    </div>
                    <span className={styles.projectTotal}>{formatDuration(summary.totalDuration)}</span>
                  </div>
                  <div className={styles.metrics}>
                    <span>
                      今日 <b>{formatDuration(summary.todayDuration)}</b>
                    </span>
                    <span>
                      有效次数 <b>{summary.sessionCount}</b>
                    </span>
                    <span>
                      占比 <b>{percent}%</b>
                    </span>
                  </div>
                  <div className={styles.shareTrack} aria-label={summary.name + ' 占比 ' + percent + '%'}>
                    <span className={styles.shareFill} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default memo(ProjectAnalytics);

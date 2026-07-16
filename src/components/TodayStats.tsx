import { memo, useMemo, type CSSProperties } from 'react';
import { useStatsStore } from '../stores/statsStore';
import { useTimerStore } from '../stores/timerStore';
import { formatDuration } from '../utils/format';
import { findProjectById, getProjectColorValue } from '../utils/projects';
import { calculateProjectSummaries } from '../utils/stats';
import styles from './TodayStats.module.css';

function TodayStats() {
  const todayTotal = useStatsStore((state) => state.todayTotal);
  const sessions = useStatsStore((state) => state.sessions);
  const projects = useStatsStore((state) => state.projects);
  const projectId = useTimerStore((state) => state.projectId);

  const selectedProject = useMemo(
    () => findProjectById(projects, projectId),
    [projectId, projects]
  );
  const projectTodayTotal = useMemo(() => {
    const summary = calculateProjectSummaries(sessions, projects).find(
      (item) => item.projectId === selectedProject.id && !item.isLegacy
    );
    return summary?.todayDuration ?? 0;
  }, [projects, selectedProject.id, sessions]);

  const projectStyle = {
    '--project-color': getProjectColorValue(selectedProject.color)
  } as CSSProperties;

  return (
    <div className={styles.container}>
      <div className={styles.total}>
        <span className={styles.label}>今日专注</span>
        <span className={styles.value}>{formatDuration(todayTotal)}</span>
      </div>
      <span className={styles.divider} aria-hidden="true" />
      <div
        className={styles.project}
        style={projectStyle}
        aria-label={'当前项目 ' + selectedProject.name + ' 今日 ' + formatDuration(projectTodayTotal)}
      >
        <span className={styles.projectDot} aria-hidden="true" />
        <span className={styles.projectName}>{selectedProject.name}</span>
        <span className={styles.projectValue}>{formatDuration(projectTodayTotal)}</span>
      </div>
    </div>
  );
}

export default memo(TodayStats);

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { BarChart3, Clock, Download, Flame, List, Trash2, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useStatsStore } from '../stores/statsStore';
import type { FocusSession, StudyProject } from '../types';
import { formatDuration } from '../utils/format';
import { calculateProjectSummaries, calculateRecentDailyTotals } from '../utils/stats';
import { DEFAULT_PROJECT, getProjectColorValue } from '../utils/projects';
import ProjectAnalytics from './ProjectAnalytics';
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

type HistoryTab = 'stats' | 'records';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRecordProject(
  session: FocusSession,
  projectsById: Map<string, StudyProject>
): StudyProject | null {
  return session.projectId ? projectsById.get(session.projectId) ?? null : null;
}

function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>('stats');
  const dialogRef = useRef<HTMLDivElement>(null);
  const sessions = useStatsStore((state) => state.sessions);
  const projects = useStatsStore((state) => state.projects);
  const todayTotal = useStatsStore((state) => state.todayTotal);
  const totalDuration = useStatsStore((state) => state.totalDuration);
  const currentStreak = useStatsStore((state) => state.currentStreak);
  const deleteSession = useStatsStore((state) => state.deleteSession);
  const clearAllSessions = useStatsStore((state) => state.clearAllSessions);

  useDialogFocus(isOpen, onClose, dialogRef);

  useEffect(() => {
    if (!isOpen) {
      setShowClearConfirm(false);
      setIsClearing(false);
      return;
    }

    setShowClearConfirm(false);
    setIsClearing(false);
    setActiveTab('stats');
  }, [isOpen]);

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort((left, right) => right.startedAt - left.startedAt);
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
      totalMs: group.reduce((total, session) => total + session.duration, 0)
    }));
  }, [sessions]);

  const projectSummaries = useMemo(
    () => calculateProjectSummaries(sessions, projects),
    [projects, sessions]
  );
  const dailyTotals = useMemo(() => calculateRecentDailyTotals(sessions), [sessions]);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  if (!isOpen) return null;

  const handleClearAll = async () => {
    if (showClearConfirm) {
      setIsClearing(true);
      try {
        await clearAllSessions();
      } finally {
        setIsClearing(false);
        setShowClearConfirm(false);
      }
      return;
    }
    setShowClearConfirm(true);
  };

  const handleExport = () => {
    const data = sessions.map((session) => ({
      id: session.id,
      projectId: session.projectId ?? null,
      projectName: session.subject,
      subject: session.subject,
      status: session.status,
      mode: session.mode,
      startedAt: new Date(session.startedAt).toISOString(),
      endedAt: new Date(session.endedAt).toISOString(),
      durationSeconds: Math.floor(session.duration / 1000),
      durationFormatted: formatDuration(session.duration),
      targetDurationSeconds: Math.floor(session.targetDuration / 1000)
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'study-timer-records-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>FOCUS INSIGHTS</span>
            <h2 id="history-modal-title" className={styles.title}>
              统计与记录
            </h2>
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
            <span className={styles.statValue}>{currentStreak > 0 ? currentStreak + ' 天' : '-'}</span>
          </div>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="统计与记录切换">
          <button
            id="history-stats-tab"
            className={styles.tab}
            data-active={activeTab === 'stats'}
            role="tab"
            aria-selected={activeTab === 'stats'}
            aria-controls="history-stats-panel"
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={13} aria-hidden="true" />
            统计
          </button>
          <button
            id="history-records-tab"
            className={styles.tab}
            data-active={activeTab === 'records'}
            role="tab"
            aria-selected={activeTab === 'records'}
            aria-controls="history-records-panel"
            onClick={() => setActiveTab('records')}
          >
            <List size={13} aria-hidden="true" />
            记录
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'stats' ? (
            <section
              id="history-stats-panel"
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby="history-stats-tab"
            >
              <ProjectAnalytics dailyTotals={dailyTotals} summaries={projectSummaries} />
            </section>
          ) : (
            <section
              id="history-records-panel"
              className={styles.recordsPanel}
              role="tabpanel"
              aria-labelledby="history-records-tab"
            >
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
                        {group.sessions.map((session, index) => {
                          const project = getRecordProject(session, projectsById);
                          const recordStyle = {
                            '--project-color': getProjectColorValue(
                              project?.color ?? DEFAULT_PROJECT.color
                            ),
                            animationDelay: String(index * 30) + 'ms'
                          } as CSSProperties;
                          return (
                            <div key={session.id} className={styles.item} style={recordStyle}>
                              <div className={styles.itemLeft}>
                                <span className={styles.time}>{formatTime(session.startedAt)}</span>
                                <span className={styles.subjectRow}>
                                  <span className={styles.projectDot} aria-hidden="true" />
                                  <span className={styles.subject}>{session.subject || '未命名项目'}</span>
                                </span>
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
                          );
                        })}
                      </section>
                    ))}
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={handleExport} title="导出 JSON">
                      <Download size={12} />
                      <span>导出 JSON</span>
                    </button>
                    <button
                      className={styles.actionBtn + ' ' + styles.actionBtnDanger}
                      data-testid="clear-history"
                      onClick={() => void handleClearAll()}
                      disabled={isClearing}
                      aria-busy={isClearing}
                    >
                      {showClearConfirm ? '确认清空' : '清空所有'}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(HistoryModal);

import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react';
import { Archive, RotateCcw, Save, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useStatsStore } from '../stores/statsStore';
import { useTimerStore } from '../stores/timerStore';
import type { ProjectColor, StudyProject } from '../types';
import {
  DEFAULT_PROJECT,
  PROJECT_COLORS,
  getProjectColorValue
} from '../utils/projects';
import styles from './ProjectManagerModal.module.css';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectRowProps {
  project: StudyProject;
  locked: boolean;
  onUpdated: (project: StudyProject) => void;
  onArchived: (project: StudyProject) => void;
  onRestored: (project: StudyProject) => void;
}

const COLOR_LABELS: Record<ProjectColor, string> = {
  indigo: '靛蓝色',
  violet: '紫色',
  cyan: '青色',
  emerald: '绿色',
  amber: '琥珀色',
  rose: '玫瑰色'
};

function ProjectRow({
  project,
  locked,
  onUpdated,
  onArchived,
  onRestored
}: ProjectRowProps) {
  const updateProject = useStatsStore((state) => state.updateProject);
  const archiveProject = useStatsStore((state) => state.archiveProject);
  const restoreProject = useStatsStore((state) => state.restoreProject);
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState<ProjectColor>(project.color);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(project.name);
    setColor(project.color);
    setMessage('');
  }, [project.archivedAt, project.color, project.name]);

  const isArchived = project.archivedAt !== null;
  const isDefault = project.id === DEFAULT_PROJECT.id;
  const changed = name.trim() !== project.name || color !== project.color;
  const colorStyle = {
    '--project-color': getProjectColorValue(color)
  } as CSSProperties;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changed || locked || isArchived) return;

    setIsSaving(true);
    setMessage('');
    try {
      const updated = await updateProject(project.id, { name, color });
      if (!updated) {
        setMessage('名称重复或不符合要求。');
        return;
      }
      onUpdated(updated);
      setMessage('已保存');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (locked || isDefault) return;
    const archived = await archiveProject(project.id);
    if (archived) onArchived(project);
  };

  const handleRestore = async () => {
    if (locked) return;
    const restored = await restoreProject(project.id);
    if (restored) {
      const updated = useStatsStore.getState().projects.find((item) => item.id === project.id);
      if (updated) onRestored(updated);
    } else {
      setMessage('无法恢复：存在同名项目。');
    }
  };

  return (
    <form
      className={styles.projectRow}
      data-archived={isArchived}
      onSubmit={handleSave}
      style={colorStyle}
    >
      <span className={styles.projectDot} aria-hidden="true" />
      <div className={styles.projectFields}>
        <label className={styles.srOnly} htmlFor={'project-name-' + project.id}>
          项目名称
        </label>
        <input
          id={'project-name-' + project.id}
          className={styles.nameInput}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={20}
          disabled={locked || isArchived || isSaving}
          aria-label={'项目名称 ' + project.name}
        />
        <div className={styles.colorChoices} aria-label={'项目颜色 ' + project.name}>
          {PROJECT_COLORS.map((option) => {
            const optionStyle = {
              '--project-color': getProjectColorValue(option)
            } as CSSProperties;
            return (
              <button
                key={option}
                type="button"
                className={styles.colorButton}
                data-selected={color === option}
                style={optionStyle}
                onClick={() => setColor(option)}
                disabled={locked || isArchived || isSaving}
                aria-label={'选择' + COLOR_LABELS[option]}
                aria-pressed={color === option}
              >
                <span className={styles.colorDot} />
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.rowActions}>
        {isArchived ? (
          <button
            type="button"
            className={styles.restoreButton}
            onClick={handleRestore}
            disabled={locked || isSaving}
            aria-label={'恢复 ' + project.name}
          >
            <RotateCcw size={13} />
            恢复
          </button>
        ) : (
          <>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={locked || isSaving || !changed}
              aria-label={'保存 ' + project.name}
            >
              <Save size={13} />
              保存
            </button>
            {!isDefault && (
              <button
                type="button"
                className={styles.archiveButton}
                onClick={handleArchive}
                disabled={locked || isSaving}
                aria-label={'归档 ' + project.name}
              >
                <Archive size={13} />
              </button>
            )}
          </>
        )}
      </div>
      {message && (
        <span className={styles.rowMessage} role="status">
          {message}
        </span>
      )}
    </form>
  );
}

function ProjectManagerModal({ isOpen, onClose }: ProjectManagerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const projects = useStatsStore((state) => state.projects);
  const status = useTimerStore((state) => state.status);
  const selectedProjectId = useTimerStore((state) => state.projectId);
  const setProject = useTimerStore((state) => state.setProject);
  const locked = status === 'RUNNING' || status === 'PAUSED';

  useDialogFocus(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const activeProjects = projects.filter((project) => project.archivedAt === null);
  const archivedProjects = projects.filter((project) => project.archivedAt !== null);

  const handleUpdated = (project: StudyProject) => {
    if (project.id === selectedProjectId) setProject(project);
  };

  const handleArchived = (project: StudyProject) => {
    if (project.id === selectedProjectId) setProject(DEFAULT_PROJECT);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-manager-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>PROJECT SPACE</span>
            <h2 id="project-manager-title" className={styles.title}>
              项目管理
            </h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </header>

        {locked && (
          <p className={styles.lockNotice} role="status">
            计时进行中，项目管理已锁定；结束后可继续编辑。
          </p>
        )}

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="active-projects-title">
            <h3 id="active-projects-title" className={styles.sectionTitle}>
              当前项目
            </h3>
            <div className={styles.projectList}>
              {activeProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  locked={locked}
                  onUpdated={handleUpdated}
                  onArchived={handleArchived}
                  onRestored={handleUpdated}
                />
              ))}
            </div>
          </section>

          {archivedProjects.length > 0 && (
            <section className={styles.section} aria-labelledby="archived-projects-title">
              <h3 id="archived-projects-title" className={styles.sectionTitle}>
                已归档
              </h3>
              <div className={styles.projectList}>
                {archivedProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    locked={locked}
                    onUpdated={handleUpdated}
                    onArchived={handleArchived}
                    onRestored={handleUpdated}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectManagerModal);

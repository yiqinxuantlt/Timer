import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react';
import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react';
import type { ProjectColor } from '../types';
import { useStatsStore } from '../stores/statsStore';
import { useTimerStore } from '../stores/timerStore';
import {
  PROJECT_COLORS,
  findProjectById,
  getProjectColorValue
} from '../utils/projects';
import styles from './ProjectPicker.module.css';

interface ProjectPickerProps {
  disabled: boolean;
  onManage: () => void;
}

const COLOR_LABELS: Record<ProjectColor, string> = {
  indigo: '靛蓝色',
  violet: '紫色',
  cyan: '青色',
  emerald: '绿色',
  amber: '琥珀色',
  rose: '玫瑰色'
};

function ProjectPicker({ disabled, onManage }: ProjectPickerProps) {
  const projects = useStatsStore((state) => state.projects);
  const createProject = useStatsStore((state) => state.createProject);
  const projectId = useTimerStore((state) => state.projectId);
  const setProject = useTimerStore((state) => state.setProject);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<ProjectColor>('indigo');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const activeProjects = projects.filter((project) => project.archivedAt === null);
  const selectedProject = findProjectById(projects, projectId);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setError('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsCreating(false);
        setError('');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!disabled) return;
    setIsOpen(false);
    setIsCreating(false);
    setError('');
  }, [disabled]);

  const handleSelect = (id: string) => {
    const project = activeProjects.find((item) => item.id === id);
    if (!project || disabled) return;
    setProject(project);
    setIsOpen(false);
    setIsCreating(false);
    setError('');
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const project = await createProject({ name, color });
      if (!project) {
        setError('项目名称已存在，或名称不符合要求。');
        return;
      }

      setProject(project);
      setName('');
      setColor('indigo');
      setIsCreating(false);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreate = () => {
    setIsCreating(true);
    setError('');
  };

  const handleManage = () => {
    setIsOpen(false);
    setIsCreating(false);
    setError('');
    onManage();
  };

  const selectedStyle = {
    '--project-color': getProjectColorValue(selectedProject.color)
  } as CSSProperties;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-label="选择项目"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={selectedStyle}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.triggerText}>{selectedProject.name}</span>
        <ChevronDown size={12} className={styles.chevron} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu" aria-label="项目列表">
          {isCreating ? (
            <form className={styles.createForm} onSubmit={handleCreate}>
              <label className={styles.srOnly} htmlFor="new-project-name">
                项目名称
              </label>
              <input
                id="new-project-name"
                className={styles.nameInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={20}
                placeholder="例如：毕业设计"
                autoFocus
              />
              <div className={styles.colorRow} aria-label="项目颜色">
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
                      aria-label={'选择' + COLOR_LABELS[option]}
                      aria-pressed={color === option}
                    >
                      <span className={styles.colorDot} />
                    </button>
                  );
                })}
              </div>
              {error && (
                <p className={styles.formError} role="status">
                  {error}
                </p>
              )}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setIsCreating(false);
                    setError('');
                  }}
                  disabled={isSaving}
                >
                  返回
                </button>
                <button type="submit" className={styles.createButton} disabled={isSaving}>
                  {isSaving ? '创建中…' : '创建项目'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={styles.projectList}>
                {activeProjects.map((project) => {
                  const projectStyle = {
                    '--project-color': getProjectColorValue(project.color)
                  } as CSSProperties;
                  const isSelected = project.id === selectedProject.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={styles.projectOption}
                      style={projectStyle}
                      onClick={() => handleSelect(project.id)}
                      aria-pressed={isSelected}
                      role="menuitemradio"
                    >
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.projectName}>{project.name}</span>
                      {isSelected && <Check size={13} className={styles.check} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <div className={styles.menuDivider} />
              <button type="button" className={styles.action} onClick={handleOpenCreate}>
                <Plus size={13} aria-hidden="true" />
                新建项目
              </button>
              <button type="button" className={styles.action} onClick={handleManage}>
                <Settings2 size={13} aria-hidden="true" />
                管理项目
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ProjectPicker);

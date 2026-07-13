import { memo, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import styles from './SubjectInput.module.css';

function SubjectInput() {
  const { subject, setSubject, status } = useTimerStore();
  const [localSubject, setLocalSubject] = useState(subject);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalSubject(subject);
  }, [subject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSubject(e.target.value);
  };

  const handleBlur = () => {
    const trimmed = localSubject.trim() || '学习';
    setSubject(trimmed);
    setLocalSubject(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const isRunning = status === 'RUNNING' || status === 'PAUSED';

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="展开科目设置"
      >
        <span className={styles.toggleLabel}>
          科目 · {localSubject || '学习'}
        </span>
        <ChevronDown
          size={12}
          className={`${styles.toggleIcon} ${isExpanded ? styles.toggleIconOpen : ''}`}
        />
      </button>

      <div className={`${styles.panel} ${isExpanded ? styles.panelOpen : ''}`}>
        <input
          id="subject-input"
          className={styles.input}
          type="text"
          value={localSubject}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="输入科目名称"
          disabled={isRunning}
          aria-label="学习科目"
        />
      </div>
    </div>
  );
}

export default memo(SubjectInput);
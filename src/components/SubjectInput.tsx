import { memo, useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import styles from './SubjectInput.module.css';

function SubjectInput() {
  const { subject, setSubject, status } = useTimerStore();
  const [localSubject, setLocalSubject] = useState(subject);

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
      <label className={styles.label} htmlFor="subject-input">
        subject
      </label>
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
  );
}

export default memo(SubjectInput);
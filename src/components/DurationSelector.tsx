import { memo, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { useSettingsStore } from '../stores/settingsStore';
import styles from './DurationSelector.module.css';

const PRESET_DURATIONS = [
  { label: '15m', value: 15 * 60 * 1000 },
  { label: '25m', value: 25 * 60 * 1000 },
  { label: '30m', value: 30 * 60 * 1000 },
  { label: '45m', value: 45 * 60 * 1000 },
  { label: '1h', value: 60 * 60 * 1000 },
  { label: '1.5h', value: 90 * 60 * 1000 },
  { label: '2h', value: 120 * 60 * 1000 },
];

function DurationSelector() {
  const { targetDuration, setTargetDuration, status } = useTimerStore();
  const { setTargetDuration: setSettingsTargetDuration } = useSettingsStore();
  const isRunning = status === 'RUNNING' || status === 'PAUSED';

  // Sync timerStore with settingsStore on mount
  useEffect(() => {
    const settingsDuration = useSettingsStore.getState().targetDuration;
    if (settingsDuration !== targetDuration) {
      setTargetDuration(settingsDuration);
    }
  }, []);

  const handleSelect = (value: number) => {
    setTargetDuration(value);
    setSettingsTargetDuration(value); // Sync to settingsStore
  };

  return (
    <div className={styles.container}>
      <div className={styles.options}>
        {PRESET_DURATIONS.map((option) => (
          <button
            key={option.value}
            className={`${styles.option} ${
              targetDuration === option.value ? styles.optionActive : ''
            }`}
            onClick={() => handleSelect(option.value)}
            disabled={isRunning}
            aria-label={`设置目标时长为 ${option.label}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(DurationSelector);
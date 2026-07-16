# Timer Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the timer display with a low-distraction breathing glow, refined numeric typography, and clear static feedback for paused and completed states.

**Architecture:** Reuse the existing `TimerStatus` prop as the only visual input. `TimerRing` will expose its status and size as stable DOM attributes, choose the paused SVG gradient, and leave all timing calculations untouched. CSS Modules will render the decorative halo and motion; global tokens will centralize colors and rhythm, while the compact view receives only typography polish.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + React Testing Library, Vite, Tauri 2.

---

## File structure

| File | Change | Responsibility |
| --- | --- | --- |
| `tests/TimerRing.test.tsx` | Create | Lock down the state/size DOM contract and paused gradient selection. |
| `src/components/TimerRing.tsx` | Modify | Expose visual state attributes and add a paused SVG gradient without touching timer calculations. |
| `src/styles/globals.css` | Modify | Define reusable timer-motion color and duration tokens. |
| `src/components/TimerRing.module.css` | Modify | Render the halo, all state-specific visual treatment, motion reduction behavior, and normal/mini scale variants. |
| `src/components/CompactTimer.module.css` | Modify | Bring compact time typography in line with the main timer. |

### Task 1: Establish and test the timer-ring visual state contract

**Files:**

- Create: `tests/TimerRing.test.tsx`
- Modify: `src/components/TimerRing.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `tests/TimerRing.test.tsx` with this complete test suite:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TimerRing from '../src/components/TimerRing';

describe('TimerRing visual state contract', () => {
  it('exposes the running state while keeping its time text stable', () => {
    render(<TimerRing progress={0.4} status="RUNNING" elapsed={1_472_000} />);

    expect(screen.getByTestId('timer-ring')).toHaveAttribute('data-status', 'RUNNING');
    expect(screen.getByTestId('timer-ring')).toHaveAttribute('data-size', 'normal');
    expect(screen.getByText('00:24:32')).toBeVisible();
  });

  it('uses the paused visual state and warm paused gradient for a mini ring', () => {
    render(<TimerRing progress={0.4} size="mini" status="PAUSED" elapsed={1_472_000} />);

    expect(screen.getByTestId('timer-ring')).toHaveAttribute('data-status', 'PAUSED');
    expect(screen.getByTestId('timer-ring')).toHaveAttribute('data-size', 'mini');
    expect(screen.getByTestId('timer-progress').getAttribute('style')).toContain(
      'progressGradientPaused'
    );
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm test -- tests/TimerRing.test.tsx
```

Expected: FAIL because `timer-ring`, `timer-progress`, `data-status`, `data-size`, and the paused gradient do not exist yet.

- [ ] **Step 3: Implement the DOM contract and paused SVG gradient**

Replace `src/components/TimerRing.tsx` with the following implementation. This preserves the existing progress clamping, status labels, and elapsed-time formatting while adding purely visual state hooks.

```tsx
import { memo, useId } from 'react';
import type { TimerStatus } from '../types';
import { formatElapsed } from '../utils/format';
import styles from './TimerRing.module.css';

interface TimerRingProps {
  progress: number;
  size?: 'normal' | 'compact' | 'mini';
  status?: TimerStatus;
  elapsed?: number;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_LABELS: Record<TimerStatus, string> = {
  IDLE: '准备开始',
  RUNNING: '专注中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  CANCELLED: '已停止'
};

function TimerRing({ progress, size = 'normal', status = 'IDLE', elapsed = 0 }: TimerRingProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `progressGradient${id}`;
  const activeGradientId = `progressGradientActive${id}`;
  const pausedGradientId = `progressGradientPaused${id}`;
  const completedGradientId = `progressGradientCompleted${id}`;
  const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));
  const containerClass =
    size === 'compact'
      ? styles.containerCompact
      : size === 'mini'
        ? styles.containerMini
        : styles.container;
  const progressClass = `${styles.progressCircle} ${
    status === 'COMPLETED'
      ? styles.progressCircleCompleted
      : status === 'RUNNING'
        ? styles.progressCircleRunning
        : ''
  }`;
  const svgSize = size === 'mini' ? 64 : size === 'compact' ? 80 : 160;
  const progressStroke =
    status === 'COMPLETED'
      ? `url(#${completedGradientId})`
      : status === 'PAUSED'
        ? `url(#${pausedGradientId})`
        : status === 'RUNNING'
          ? `url(#${activeGradientId})`
          : `url(#${gradientId})`;

  return (
    <div
      className={containerClass}
      data-size={size}
      data-status={status}
      data-testid="timer-ring"
    >
      <svg className={styles.svg} width={svgSize} height={svgSize} viewBox="0 0 160 160">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id={activeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={pausedGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id={completedGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle className={styles.bgCircle} cx="80" cy="80" r={RADIUS} />
        <circle
          className={progressClass}
          cx="80"
          cy="80"
          data-testid="timer-progress"
          r={RADIUS}
          style={{
            stroke: progressStroke,
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: offset
          }}
        />
      </svg>

      {size === 'normal' && (
        <div className={styles.innerContent}>
          <span className={styles.innerTime}>{formatElapsed(elapsed)}</span>
          <span
            className={`${styles.innerLabel} ${
              styles[`innerLabel${status.charAt(0)}${status.slice(1).toLowerCase()}`]
            }`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(TimerRing);
```

- [ ] **Step 4: Run the focused test and type check**

Run:

```powershell
npm test -- tests/TimerRing.test.tsx
npm run typecheck
```

Expected: both commands exit with code 0; the tests prove the running/mini DOM contract and paused gradient selection.

- [ ] **Step 5: Commit the testable component contract**

```powershell
git add tests/TimerRing.test.tsx src/components/TimerRing.tsx
git commit -m "test: cover timer ring visual states"
```

### Task 2: Add the calm breathing halo and state-specific timer-ring styling

**Files:**

- Modify: `src/styles/globals.css`
- Modify: `src/components/TimerRing.module.css`

- [ ] **Step 1: Add reusable motion tokens to `src/styles/globals.css`**

Add these declarations immediately after `--shadow-glow` in `:root`:

```css
  --timer-breathe-duration: 4.8s;
  --timer-glow-running: rgba(129, 140, 248, 0.4);
  --timer-glow-paused: rgba(251, 191, 36, 0.32);
  --timer-glow-completed: rgba(52, 211, 153, 0.42);
```

Do not add a container animation: the ring halo is the only moving surface, and the existing `.app-running` / `.app-completed` state atmosphere remains intact.

- [ ] **Step 2: Replace `src/components/TimerRing.module.css` with the visual system below**

```css
.container,
.containerCompact,
.containerMini {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
}

.container {
  width: 160px;
  height: 160px;
}

.containerCompact {
  width: 80px;
  height: 80px;
}

.containerMini {
  width: 64px;
  height: 64px;
}

.container::before,
.containerCompact::before,
.containerMini::before {
  position: absolute;
  z-index: 0;
  width: calc(100% + 22px);
  height: calc(100% + 22px);
  border-radius: 50%;
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: scale(0.92);
}

.container[data-status='RUNNING']::before,
.containerCompact[data-status='RUNNING']::before,
.containerMini[data-status='RUNNING']::before {
  background: radial-gradient(circle, var(--timer-glow-running) 0%, transparent 68%);
  animation: timerBreathe var(--timer-breathe-duration) var(--ease-out) infinite;
}

.container[data-status='PAUSED']::before,
.containerCompact[data-status='PAUSED']::before,
.containerMini[data-status='PAUSED']::before {
  background: radial-gradient(circle, var(--timer-glow-paused) 0%, transparent 68%);
  opacity: 0.34;
  transform: scale(0.97);
}

.container[data-status='COMPLETED']::before,
.containerCompact[data-status='COMPLETED']::before,
.containerMini[data-status='COMPLETED']::before {
  background: radial-gradient(circle, var(--timer-glow-completed) 0%, transparent 68%);
  animation: completionBloom 520ms var(--ease-out) both;
}

.svg {
  position: absolute;
  z-index: 1;
  inset: 0;
  transform: rotate(-90deg);
}

.bgCircle {
  fill: none;
  stroke: rgba(129, 140, 248, 0.17);
  stroke-width: 4;
}

.progressCircle {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 300ms var(--ease-out);
  filter: drop-shadow(0 0 7px rgba(99, 102, 241, 0.38));
}

.progressCircleRunning {
  filter: drop-shadow(0 0 10px rgba(129, 140, 248, 0.52));
  animation: ringGlowBreathe var(--timer-breathe-duration) ease-in-out infinite;
}

.progressCircleCompleted {
  filter: drop-shadow(0 0 12px rgba(52, 211, 153, 0.58));
  animation: completePop 520ms var(--ease-out);
  transform-box: fill-box;
  transform-origin: center;
}

.innerContent {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  pointer-events: none;
}

.innerTime {
  color: var(--text-primary);
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-size: 30px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-medium);
  letter-spacing: -0.045em;
  line-height: 1;
  text-shadow: 0 1px 14px rgba(99, 102, 241, 0.14);
}

.innerLabel {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.12em;
}

.innerLabelRunning {
  color: var(--accent-tertiary);
}

.innerLabelPaused {
  color: var(--warning);
}

.innerLabelCompleted {
  color: var(--success);
}

@keyframes timerBreathe {
  0%,
  100% {
    opacity: 0.24;
    transform: scale(0.92);
  }

  50% {
    opacity: 0.72;
    transform: scale(1.04);
  }
}

@keyframes ringGlowBreathe {
  0%,
  100% {
    opacity: 0.82;
  }

  50% {
    opacity: 1;
  }
}

@keyframes completionBloom {
  0% {
    opacity: 0;
    transform: scale(0.78);
  }

  55% {
    opacity: 0.72;
    transform: scale(1.06);
  }

  100% {
    opacity: 0;
    transform: scale(1.12);
  }
}

@keyframes completePop {
  0% {
    opacity: 0.76;
    transform: scale(0.97);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.containerMini::before {
  width: calc(100% + 12px);
  height: calc(100% + 12px);
}

.containerMini .bgCircle,
.containerMini .progressCircle,
.containerMini .progressCircleRunning,
.containerMini .progressCircleCompleted {
  stroke-width: 3;
}

.containerMini .progressCircleRunning {
  filter: drop-shadow(0 0 6px rgba(129, 140, 248, 0.46));
}

.containerMini .progressCircleCompleted {
  filter: drop-shadow(0 0 7px rgba(52, 211, 153, 0.5));
}

@media (prefers-reduced-motion: reduce) {
  .container[data-status='RUNNING']::before,
  .containerCompact[data-status='RUNNING']::before,
  .containerMini[data-status='RUNNING']::before,
  .container[data-status='COMPLETED']::before,
  .containerCompact[data-status='COMPLETED']::before,
  .containerMini[data-status='COMPLETED']::before,
  .progressCircleRunning,
  .progressCircleCompleted {
    animation: none;
  }

  .container[data-status='RUNNING']::before,
  .containerCompact[data-status='RUNNING']::before,
  .containerMini[data-status='RUNNING']::before {
    opacity: 0.3;
    transform: scale(0.97);
  }
}
```

- [ ] **Step 3: Verify the CSS-only motion layer builds successfully**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit with code 0. The build proves CSS Modules accept the new selectors and keyframes without changing timer logic.

- [ ] **Step 4: Commit the ring visual system**

```powershell
git add src/styles/globals.css src/components/TimerRing.module.css
git commit -m "feat: add calm timer breathing motion"
```

### Task 3: Match compact typography and complete visual QA

**Files:**

- Modify: `src/components/CompactTimer.module.css`
- Test: `tests/TimerRing.test.tsx`

- [ ] **Step 1: Refine the compact time readout**

Replace only the `.timeDisplay` rule in `src/components/CompactTimer.module.css` with:

```css
.timeDisplay {
  color: var(--text-primary);
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-medium);
  letter-spacing: -0.025em;
  line-height: 1;
  text-shadow: 0 1px 10px rgba(99, 102, 241, 0.12);
}
```

- [ ] **Step 2: Run all automated checks**

Run:

```powershell
npm test
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: every command exits with code 0. The full test suite must continue to cover timer state-machine behavior, persistence, statistics, Pomodoro behavior, and dialogs alongside the new ring test.

- [ ] **Step 3: Perform desktop visual and interaction QA**

Run:

```powershell
npm run tauri:dev
```

Verify each item before closing the desktop app:

1. In the normal window, start a focus session and confirm the numerical time remains stationary while the halo completes a slow, subtle 4.8-second cycle.
2. Pause the session and confirm that all looping movement stops, the ring becomes amber, and the warm halo remains static.
3. Resume, then complete a session; confirm one green completion bloom occurs and does not loop.
4. Toggle compact mode; confirm the mini ring has the same status language at lower intensity and the right-side time stays aligned.
5. Switch OS theme or the app's system color setting; confirm the digits retain contrast in light and dark appearances.
6. Enable the operating system's “reduce motion” setting, restart the app if needed, and confirm no breathing or completion animation plays while status color feedback remains.
7. Start, pause, stop, relaunch, and restore an active session to confirm timing, persistence, window controls, keyboard shortcuts, and DPI scaling were not affected.

- [ ] **Step 4: Commit the compact readout polish after all checks pass**

```powershell
git add src/components/CompactTimer.module.css
git commit -m "style: refine compact timer readout"
```

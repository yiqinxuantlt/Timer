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

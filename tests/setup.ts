import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetTauriCache } from '../src/lib/platform';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetTauriCache();
  vi.useRealTimers();
});

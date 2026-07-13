/**
 * Platform detection utilities
 * Centralized Tauri environment detection using official API
 */

import { isTauri as checkIsTauri } from '@tauri-apps/api/core';

let _isTauri: boolean | null = null;

/**
 * Check if running in Tauri desktop environment
 * Uses official Tauri API for reliable detection
 */
export async function isTauri(): Promise<boolean> {
  if (_isTauri !== null) {
    return _isTauri;
  }

  try {
    _isTauri = await checkIsTauri();
    return _isTauri;
  } catch {
    _isTauri = false;
    return false;
  }
}

/**
 * Synchronous check - only use after initial async check
 * Returns null if not yet determined
 */
export function isTauriSync(): boolean | null {
  return _isTauri;
}

/**
 * Reset cached value (for testing)
 */
export function resetTauriCache(): void {
  _isTauri = null;
}
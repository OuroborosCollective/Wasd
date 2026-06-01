/**
 * Input Lock Utility
 * 
 * Provides utilities to block player intents during divergence.
 * Zero-Trust architecture: ALL inputs are blocked when diverged.
 */

import { clientManifestTracker } from './ClientManifestTracker.js';

/**
 * Check if the manifest system indicates divergence
 */
export function isInputLocked(): boolean {
  const state = clientManifestTracker.getState();
  return state.diverged;
}

/**
 * Guard function to wrap intent handlers
 * Returns true if input should be blocked
 */
export function guardInput(): boolean {
  if (isInputLocked()) {
    console.warn('[InputLock] Intent blocked - system divergent');
    return true;
  }
  return false;
}

/**
 * Type-safe wrapper for any intent handler
 */
export function withInputLock<T extends (...args: unknown[]) => void>(
  handler: T
): T {
  return ((...args: unknown[]) => {
    if (guardInput()) return;
    return handler(...args);
  }) as T;
}

/**
 * Async intent handler wrapper
 */
export function withInputLockAsync<T extends (...args: unknown[]) => Promise<void>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    if (guardInput()) return;
    return handler(...args);
  }) as T;
}

// ─── Intent Constants ─────────────────────────────────────────────────────────

export const BLOCKED_INTENTS = {
  MOVE: 'player:move',
  ATTACK: 'player:attack',
  CAST: 'player:cast',
  INTERACT: 'player:interact',
  CHAT: 'player:chat',
  USE_ITEM: 'player:use_item',
  DROP_ITEM: 'player:drop_item',
  EQUIP: 'player:equip',
  UNEQUIP: 'player:unequip',
  QUEST: 'player:quest',
  TRADE: 'player:trade',
} as const;

/**
 * Check if an intent type is blocked
 */
export function isBlockedIntent(intentType: string): boolean {
  return Object.values(BLOCKED_INTENTS).includes(intentType as any);
}

/**
 * Dispatch a blocked intent with logging
 */
export function dispatchBlockedIntent(intentType: string, payload?: unknown): void {
  if (guardInput()) {
    console.warn(`[InputLock] Blocked intent: ${intentType}`, payload);
    // Could emit a visual feedback event here
    window.dispatchEvent(new CustomEvent('wasd:intent-blocked', {
      detail: { intentType, payload, blockedAt: Date.now() }
    }));
  }
}
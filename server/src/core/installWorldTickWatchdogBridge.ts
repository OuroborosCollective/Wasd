// MIGRATED: This module has been adapted for WorldTickThinShell
// The watchdog bridge now integrates with the thin shell's tick system

import { worldTickAdapter } from './are/WorldTickThinShellAdapter.js';
import { eventBus } from './axiomatic-event-bus';
import { serverWatchdogEmitter } from './watchdog-emitter';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS } from './watchdog-determinism';
import { liveWatchdogSensors } from './watchdog-live-sensors.js';

let installed = false;

/**
 * @deprecated MIGRATED: This function is deprecated.
 * Watchdog bridge is now integrated directly into WorldTickThinShell.
 * This stub exists for backward compatibility during migration.
 */
export function installWorldTickWatchdogBridge(): void {
  if (installed) return;
  installed = true;

  // The watchdog is now integrated into WorldTickThinShell
  // The thin shell handles tick counting, event publishing, and sensor evaluation
  // This module kept for backward compatibility
  
  console.log('[WorldTickWatchdogBridge] DEPRECATED: Watchdog now integrated in WorldTickThinShell');
  
  // Provide a stub getWatchdogLedgerStatus on the adapter
  (worldTickAdapter as any).__watchdogTickBridgeInstalled = true;
  (worldTickAdapter as any).getWatchdogLedgerStatus = function getWatchdogLedgerStatus() {
    const ledger = eventBus.getLedgerStats();
    return {
      installed: true,
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      ledger,
      worldTick: worldTickAdapter.tickCount,
      worldHash: null, // Will be populated by thin shell
      guard: null,
      sensors: liveWatchdogSensors.getState(),
    };
  };
}

function safeCount(read: () => unknown): number {
  try {
    const value = read();
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

function safeSize(value: unknown): number {
  return value && typeof value === 'object' && 'size' in value && typeof (value as { size?: unknown }).size === 'number'
    ? Number((value as { size: number }).size)
    : 0;
}

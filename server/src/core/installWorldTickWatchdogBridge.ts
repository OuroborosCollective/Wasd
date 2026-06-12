// MIGRATED: This module has been adapted for WorldTickThinShell
// The watchdog bridge now integrates with the thin shell's tick system

import { worldTickAdapter } from './are/WorldTickThinShellAdapter.js';
import { eventBus } from './axiomatic-event-bus.js';
import { serverWatchdogEmitter } from './watchdog-emitter.js';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS } from './watchdog-determinism.js';
import { liveWatchdogSensors } from './watchdog-live-sensors.js';

let installed = false;

/**
 * @deprecated MIGRATED: This function is deprecated.
 * Watchdog bridge is now integrated directly into WorldTickThinShell.
 * This compatibility bridge only exposes deterministic watchdog status.
 */
export function installWorldTickWatchdogBridge(): void {
  if (installed) return;
  installed = true;

  console.log('[WorldTickWatchdogBridge] compatibility bridge installed; watchdog runtime is integrated in WorldTickThinShell');

  (worldTickAdapter as any).__watchdogTickBridgeInstalled = true;
  (worldTickAdapter as any).getWatchdogLedgerStatus = function getWatchdogLedgerStatus() {
    const ledger = eventBus.getLedgerStats();
    return {
      installed: true,
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      ledger,
      emitter: {
        tick: serverWatchdogEmitter.currentTick,
        seq: serverWatchdogEmitter.currentSeq,
        listeners: serverWatchdogEmitter.listenerCount,
      },
      worldTick: worldTickAdapter.tickCount,
      worldHash: null,
      guard: null,
      sensors: liveWatchdogSensors.getState(),
    };
  };
}

// MIGRATED: This module has been adapted for WorldTickThinShell
// The watchdog bridge now integrates with the thin shell's tick system.

import { worldTickAdapter } from './are/WorldTickThinShellAdapter.js';
import { eventBus } from './axiomatic-event-bus.js';
import { serverWatchdogEmitter } from './watchdog-emitter.js';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS } from './watchdog-determinism.js';
import { liveWatchdogSensors } from './watchdog-live-sensors.js';

let installed = false;

type WatchdogSnapshot = {
  readonly worldHash?: string | null;
  readonly active_chunks?: readonly unknown[];
  readonly npcs?: readonly unknown[];
  readonly players?: readonly unknown[];
  readonly loot?: readonly unknown[];
};

function readWorldSnapshot(): WatchdogSnapshot | null {
  const snapshot = worldTickAdapter.buildFullState();
  return snapshot && typeof snapshot === 'object' ? snapshot as WatchdogSnapshot : null;
}

function emitWorldTickHeartbeat(): void {
  const tick = worldTickAdapter.tickCount;
  const snapshot = readWorldSnapshot();
  const spatial = worldTickAdapter.getSpatialBroadcastStats();
  const guard = worldTickAdapter.getAREGuardStatus();
  const worldHashSnapshot = worldTickAdapter.getWorldHashSnapshot();

  const players = Array.isArray(snapshot?.players) ? snapshot.players.length : 0;
  const npcs = Array.isArray(snapshot?.npcs) ? snapshot.npcs.length : 0;
  const loot = Array.isArray(snapshot?.loot) ? snapshot.loot.length : 0;
  const worldHash = worldHashSnapshot?.worldHash ?? snapshot?.worldHash ?? null;
  const guardOk = guard?.ok ?? true;

  const sensorResult = liveWatchdogSensors.evaluate({
    tick,
    players,
    npcs,
    loot,
    guardOk,
    worldHash,
  });

  eventBus.publish('world.tick.heartbeat', {
    tick,
    tickHz: WATCHDOG_TICK_HZ,
    tickMs: WATCHDOG_TICK_MS,
    worldHash,
    guardOk,
    players,
    npcs,
    loot,
    activeChunks: snapshot?.active_chunks?.length ?? spatial.chunkCount,
    entityCount: spatial.entityCount,
    sensorAlerts: sensorResult.alerts,
  }, {
    tick,
    source: 'world-tick-watchdog-bridge',
    metadata: {
      subsystem: 'WorldTickWatchdogBridge',
      deterministic: true,
    },
    silent: true,
  });

  serverWatchdogEmitter.emit('world.tick.heartbeat', {
    tick,
    tickHz: WATCHDOG_TICK_HZ,
    tickMs: WATCHDOG_TICK_MS,
    worldHash,
    guardOk,
    players,
    npcs,
    loot,
    sensorAlerts: sensorResult.alerts,
  }, guardOk ? 'LOW' : 'HIGH', 'world-tick-watchdog-bridge', tick);
}

/**
 * @deprecated MIGRATED: This function is a compatibility bridge.
 * The main watchdog runtime is integrated into WorldTickThinShell, while this
 * bridge exposes deterministic watchdog status and an install-time heartbeat.
 */
export function installWorldTickWatchdogBridge(): void {
  if (installed) return;
  installed = true;

  console.log('[WorldTickWatchdogBridge] compatibility bridge installed; watchdog runtime is integrated in WorldTickThinShell');

  emitWorldTickHeartbeat();

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
      worldHash: worldTickAdapter.getWorldHashSnapshot()?.worldHash ?? null,
      guard: worldTickAdapter.getAREGuardStatus(),
      sensors: liveWatchdogSensors.getState(),
    };
  };
}

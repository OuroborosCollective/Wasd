import { WorldTick } from './WorldTick.js';
import { eventBus } from './axiomatic-event-bus';
import { serverWatchdogEmitter } from './watchdog-emitter';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS } from './watchdog-determinism';

let installed = false;

export function installWorldTickWatchdogBridge(): void {
  if (installed) return;
  installed = true;

  const proto = WorldTick.prototype as any;
  if (proto.__watchdogTickBridgeInstalled) return;
  proto.__watchdogTickBridgeInstalled = true;

  const originalTick = proto.tick;
  if (typeof originalTick !== 'function') {
    throw new Error('[WorldTickWatchdogBridge] WorldTick.tick is not a function.');
  }

  proto.tick = function watchdogWrappedTick(...args: unknown[]) {
    const beforeTick = Number(this.tickCount ?? 0);
    const nextTick = beforeTick + 1;

    eventBus.beginTick(nextTick);
    serverWatchdogEmitter.setWorldTick(nextTick);
    eventBus.publish('world.tick.begin', {
      tick: nextTick,
      previousTick: beforeTick,
      phase: 'begin',
    }, {
      tick: nextTick,
      source: 'worldtick',
      metadata: { subsystem: 'WorldTick', phase: 'begin' },
      silent: true,
    });

    try {
      const result = originalTick.apply(this, args);
      const committedTick = Number(this.tickCount ?? nextTick);

      eventBus.beginTick(committedTick);
      eventBus.publish('world.tick.end', {
        tick: committedTick,
        phase: 'end',
        players: safeCount(() => this.playerSystem?.getAllPlayers?.()),
        npcs: safeCount(() => this.npcSystem?.getAllNPCs?.()),
        loot: safeSize(this.lootEntities),
        guardOk: Boolean(this.lastAREGuardStatus?.ok ?? true),
        worldHash: this.lastWorldHashSnapshot?.worldHash ?? null,
      }, {
        tick: committedTick,
        source: 'worldtick',
        metadata: { subsystem: 'WorldTick', phase: 'end' },
        silent: true,
      });

      if (committedTick % 10 === 0) {
        serverWatchdogEmitter.emit('world.tick.heartbeat', {
          tick: committedTick,
          players: safeCount(() => this.playerSystem?.getAllPlayers?.()),
          npcs: safeCount(() => this.npcSystem?.getAllNPCs?.()),
          loot: safeSize(this.lootEntities),
          ledger: eventBus.getLedgerStats(),
        }, 'LOW', 'worldtick', committedTick);
      }

      if (this.lastAREGuardStatus && this.lastAREGuardStatus.ok === false && committedTick % 10 === 0) {
        serverWatchdogEmitter.emit('world.tick.guard_violation', {
          tick: committedTick,
          violations: this.lastAREGuardStatus.violations ?? [],
          worldHash: this.lastWorldHashSnapshot?.worldHash ?? null,
        }, 'HIGH', 'worldtick', committedTick);
      }

      return result;
    } catch (error) {
      serverWatchdogEmitter.emit('world.tick.exception', {
        tick: nextTick,
        message: error instanceof Error ? error.message : String(error),
      }, 'CRITICAL', 'worldtick', nextTick);
      throw error;
    }
  };

  proto.getWatchdogLedgerStatus = function getWatchdogLedgerStatus() {
    const ledger = eventBus.getLedgerStats();
    return {
      installed: true,
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      ledger,
      worldTick: Number(this.tickCount ?? 0),
      worldHash: this.lastWorldHashSnapshot?.worldHash ?? null,
      guard: this.lastAREGuardStatus ?? null,
    };
  };

  console.log('[WorldTickWatchdogBridge] installed');
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

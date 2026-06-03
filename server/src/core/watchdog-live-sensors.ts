import { eventBus } from './axiomatic-event-bus';
import { serverWatchdogEmitter } from './watchdog-emitter';
import { WATCHDOG_TICK_MS, normalizePositiveInteger } from './watchdog-determinism';

export interface LiveWatchdogFrame {
  tick: number;
  players: number;
  npcs: number;
  loot: number;
  guardOk: boolean;
  worldHash: string | null;
}

export interface LiveWatchdogSensorState {
  lastTick: number;
  lastPlayers: number;
  lastNpcs: number;
  lastLoot: number;
  lastWorldHash: string | null;
  stableHashStreak: number;
}

export interface LiveWatchdogSensorResult {
  tick: number;
  alerts: string[];
  state: LiveWatchdogSensorState;
}

const DEFAULT_STATE: LiveWatchdogSensorState = {
  lastTick: 0,
  lastPlayers: 0,
  lastNpcs: 0,
  lastLoot: 0,
  lastWorldHash: null,
  stableHashStreak: 0,
};

export class LiveWatchdogSensors {
  private state: LiveWatchdogSensorState = { ...DEFAULT_STATE };

  public evaluate(frame: LiveWatchdogFrame): LiveWatchdogSensorResult {
    const tick = normalizePositiveInteger(frame.tick, this.state.lastTick);
    const alerts: string[] = [];

    if (tick < this.state.lastTick) {
      alerts.push('tick_regression');
      serverWatchdogEmitter.emit('world.sensor.tick_regression', {
        tick,
        previousTick: this.state.lastTick,
      }, 'CRITICAL', 'live-watchdog-sensors', tick);
    }

    const npcDelta = frame.npcs - this.state.lastNpcs;
    const playerDelta = frame.players - this.state.lastPlayers;
    const lootDelta = frame.loot - this.state.lastLoot;

    if (Math.abs(npcDelta) > 250) {
      alerts.push('npc_density_jump');
      serverWatchdogEmitter.emit('world.sensor.npc_density_jump', {
        tick,
        npcs: frame.npcs,
        previousNpcs: this.state.lastNpcs,
        delta: npcDelta,
      }, 'HIGH', 'live-watchdog-sensors', tick);
    }

    if (Math.abs(playerDelta) > 100) {
      alerts.push('player_population_jump');
      serverWatchdogEmitter.emit('world.sensor.player_population_jump', {
        tick,
        players: frame.players,
        previousPlayers: this.state.lastPlayers,
        delta: playerDelta,
      }, 'MEDIUM', 'live-watchdog-sensors', tick);
    }

    if (lootDelta > 500) {
      alerts.push('loot_growth_spike');
      serverWatchdogEmitter.emit('world.sensor.loot_growth_spike', {
        tick,
        loot: frame.loot,
        previousLoot: this.state.lastLoot,
        delta: lootDelta,
      }, 'MEDIUM', 'live-watchdog-sensors', tick);
    }

    if (!frame.guardOk) {
      alerts.push('guard_violation_seen');
      serverWatchdogEmitter.emit('world.sensor.guard_violation_seen', {
        tick,
        worldHash: frame.worldHash,
      }, 'HIGH', 'live-watchdog-sensors', tick);
    }

    const sameHash = frame.worldHash !== null && frame.worldHash === this.state.lastWorldHash;
    const stableHashStreak = sameHash ? this.state.stableHashStreak + 1 : 0;

    if (frame.players > 0 && frame.npcs > 0 && stableHashStreak >= 600) {
      alerts.push('world_hash_stall');
      serverWatchdogEmitter.emit('world.sensor.world_hash_stall', {
        tick,
        worldHash: frame.worldHash,
        stableHashStreak,
        simulationMs: stableHashStreak * WATCHDOG_TICK_MS,
      }, 'MEDIUM', 'live-watchdog-sensors', tick);
    }

    eventBus.publish('world.sensor.frame', {
      ...frame,
      alerts,
      npcDelta,
      playerDelta,
      lootDelta,
      stableHashStreak,
    }, {
      tick,
      source: 'live-watchdog-sensors',
      metadata: { subsystem: 'LiveWatchdogSensors' },
      silent: true,
    });

    this.state = {
      lastTick: tick,
      lastPlayers: frame.players,
      lastNpcs: frame.npcs,
      lastLoot: frame.loot,
      lastWorldHash: frame.worldHash,
      stableHashStreak,
    };

    return { tick, alerts, state: { ...this.state } };
  }

  public getState(): LiveWatchdogSensorState {
    return { ...this.state };
  }
}

export const liveWatchdogSensors = new LiveWatchdogSensors();

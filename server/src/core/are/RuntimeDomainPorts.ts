/**
 * RuntimeDomainPorts - Runtime domain bridge adapters
 * 
 * Phase 3 of Core Reality Alignment initiative.
 * 
 * Provides runtime-domain wrappers that delegate to real domain systems
 * while exposing the port interface expected by the ARE shell.
 */

import { PlayerSystem } from '../../modules/player/PlayerSystem.js';
import { WarfrontSystem } from '../../modules/warfront/WarfrontSystem.js';

// Singleton player system instance for the runtime
const runtimePlayerSystem = new PlayerSystem();

/**
 * RuntimePlayerSystem - thin wrapper exposing the port interface
 */
export class RuntimePlayerSystem {
  getPlayer(id: string) {
    return runtimePlayerSystem.getPlayer(id);
  }

  getAllPlayers() {
    return runtimePlayerSystem.getAllPlayers();
  }
}

// Internal factory for creating WarfrontSystem with optional clock
function createWarfrontSystemInternal(): WarfrontSystem {
  return new WarfrontSystem();
}

/**
 * RuntimeWarfrontPort - runtime port delegating to real WarfrontSystem
 */
export class RuntimeWarfrontPort {
  private readonly warfrontSystem: WarfrontSystem;
  private readonly tickMultiplier: () => number;

  constructor(warfrontSystem: WarfrontSystem, tickMultiplier: () => number) {
    this.warfrontSystem = warfrontSystem;
    this.tickMultiplier = tickMultiplier;
  }

  getCycleSnapshot(now?: number): ReturnType<WarfrontSystem['getCycleSnapshot']> {
    return this.warfrontSystem.getCycleSnapshot(now ?? this.tickMultiplier());
  }

  getRewardTiers(): ReturnType<WarfrontSystem['getRewardTiers']> {
    return this.warfrontSystem.getRewardTiers();
  }

  getFrontBossSpawnPoint(): ReturnType<WarfrontSystem['getFrontBossSpawnPoint']> {
    return this.warfrontSystem.getFrontBossSpawnPoint();
  }

  getStatusForPlayer(player: any, now?: number): ReturnType<WarfrontSystem['getStatusForPlayer']> {
    return this.warfrontSystem.getStatusForPlayer(player, now ?? this.tickMultiplier());
  }

  registerContribution(player: any, kind: string, amount: number, now?: number): ReturnType<WarfrontSystem['registerContribution']> {
    return this.warfrontSystem.registerContribution(player, kind as any, amount, now ?? this.tickMultiplier());
  }

  claimSeasonRewards(player: any, now?: number): ReturnType<WarfrontSystem['claimSeasonRewards']> {
    return this.warfrontSystem.claimSeasonRewards(player, now ?? this.tickMultiplier());
  }
}

/**
 * Create a new RuntimeWarfrontSystem instance.
 * Returns the underlying WarfrontSystem for registration with WarfrontTickSystem.
 */
export function createRuntimeWarfrontSystem(): WarfrontSystem {
  return createWarfrontSystemInternal();
}
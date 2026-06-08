'use strict';

import { GameEventBus } from './core/events/GameEventBus.js';
import { LootDirector } from './loot/LootDirector.js';

// Re-export LootDirector type for type-only imports
export type { LootDirector };

let lootDirectorInstance: LootDirector | null = null;
let eventBusInstance: GameEventBus | null = null;

export function bootLootSystem({ db, inventoryService, worldDropService, auditStore }: {
  db: any;
  inventoryService?: any;
  worldDropService?: any;
  auditStore?: any;
}): { eventBus: GameEventBus; lootDirector: LootDirector } {
  if (!eventBusInstance) {
    eventBusInstance = new GameEventBus();
  }

  if (!lootDirectorInstance) {
    lootDirectorInstance = new LootDirector({
      db,
      eventBus: eventBusInstance,
      inventoryService,
      worldDropService,
      auditStore
    });

    lootDirectorInstance.start();
  }

  return {
    eventBus: eventBusInstance,
    lootDirector: lootDirectorInstance
  };
}

export function getLootDirector(): LootDirector | null {
  return lootDirectorInstance;
}

export function getLootEventBus(): GameEventBus | null {
  return eventBusInstance;
}

export function emitNpcKilledLootEvent({ player, npc, zone, world, tickIndex }: {
  player: any;
  npc: any;
  zone: any;
  world: any;
  tickIndex: number;
}): void {
  if (!eventBusInstance) return;

  eventBusInstance.emitSafe('combat.npcKilled', {
    playerId: player.id,
    npcId: npc.id,
    npcType: npc.type || npc.role || 'beast',
    sourceRank: npc.rank || npc.worldBoss ? 'WORLD_BOSS' : 'NORMAL',
    areaLevel: zone.areaLevel || 1,
    treasureClassId: npc.treasureClassId,
    tickIndex,
    position: npc.position,
    biomeId: zone.biomeId || 'unknown',
    factionId: npc.factionId || zone.factionId || 'neutral',
    socialString: npc.socialString || '',
    playerReputation: player.reputation || 0,
    magicFind: player.stats?.magicFind || 0,
    killStreak: player.stats?.killStreak || 0,
    lootIndex: 0
  });
}
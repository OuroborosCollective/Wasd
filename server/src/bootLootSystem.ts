'use strict';

import { GameEventBus } from './core/events/GameEventBus.js';
import { LootDirector } from './loot/LootDirector.js';
import type { LootRollContextCanonical } from './loot/LootDelta.js';

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
      auditStore,
    });

    lootDirectorInstance.start();
  }

  return {
    eventBus: eventBusInstance,
    lootDirector: lootDirectorInstance,
  };
}

export function getLootDirector(): LootDirector | null {
  return lootDirectorInstance;
}

export function getLootEventBus(): GameEventBus | null {
  return eventBusInstance;
}

/** Test-only lifecycle hook for isolated runtime integration tests. */
export function resetLootSystemForTests(): void {
  lootDirectorInstance = null;
  eventBusInstance = null;
}

function requiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function finiteInteger(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : fallback;
}

function resolveChunkKey(zone: any, npc: any): string {
  const explicit = requiredString(zone?.chunkKey);
  if (explicit) return explicit;

  const x = Math.floor(Number(npc?.position?.x ?? 0));
  const z = Math.floor(Number(npc?.position?.z ?? npc?.position?.y ?? 0));
  return `tile:${Math.floor(x / 64)}:${Math.floor(z / 64)}`;
}

/**
 * Builds the only accepted combat-to-loot event shape. World hash, chunk hash
 * and Kappa must be supplied by the authoritative simulation; this adapter
 * deliberately refuses to invent them from wall-clock or socket state.
 */
function buildCanonicalDefeatContext({ player, npc, zone, world, tickIndex }: {
  player: any;
  npc: any;
  zone: any;
  world: any;
  tickIndex: number;
}): LootRollContextCanonical | null {
  const sourceEntityId = requiredString(player?.id);
  const defeatedEntityId = requiredString(npc?.id);
  const worldHash = requiredString(world?.worldHash ?? world?.hash);
  const chunkHash = requiredString(zone?.chunkHash ?? world?.chunkHash);
  const kappa = requiredString(world?.kappa ?? world?.kappaHash ?? world?.seedHash);
  const sourceTick = finiteInteger(tickIndex, -1);

  if (!sourceEntityId || !defeatedEntityId || !worldHash || !chunkHash || !kappa || sourceTick < 0) {
    return null;
  }

  const explicitRank = requiredString(npc?.rank);
  const sourceRank = explicitRank ?? (npc?.worldBoss === true ? 'WORLD_BOSS' : 'NORMAL');
  const treasureClassId = requiredString(npc?.treasureClassId)
    ?? (sourceRank === 'WORLD_BOSS' ? 'TC_BOSS_WORLD' : 'TC_ACT1_BEAST');

  return Object.freeze({
    sourceEntityId,
    defeatedEntityId,
    actorId: sourceEntityId,
    sourceTick,
    chunkKey: resolveChunkKey(zone, npc),
    worldHash,
    chunkHash,
    kappa,
    encounterId: requiredString(npc?.encounterId) ?? undefined,
    lootIndex: Math.max(0, finiteInteger(npc?.lootIndex, 0)),
    treasureClassId,
    areaLevel: Math.max(1, finiteInteger(zone?.areaLevel, 1)),
    magicFind: Math.max(0, finiteInteger(player?.stats?.magicFind, 0)),
    killStreak: Math.max(0, finiteInteger(player?.stats?.killStreak, 0)),
    sourceRank,
    biomeId: requiredString(zone?.biomeId) ?? 'unknown',
    factionId: requiredString(npc?.factionId ?? zone?.factionId) ?? 'neutral',
    socialString: typeof npc?.socialString === 'string' ? npc.socialString : '',
  });
}

/**
 * Publishes a confirmed NPC defeat to the canonical LootDirector path.
 *
 * The call is rejected until the runtime provides all deterministic world
 * inputs. This prevents legacy spatial fallback values from becoming loot
 * truth and gives callers an explicit failure signal for retry/telemetry.
 */
export function emitNpcKilledLootEvent({ player, npc, zone, world, tickIndex }: {
  player: any;
  npc: any;
  zone: any;
  world: any;
  tickIndex: number;
}): boolean {
  if (!eventBusInstance) return false;

  const context = buildCanonicalDefeatContext({ player, npc, zone, world, tickIndex });
  if (!context) {
    console.warn('[LootDirector] confirmed NPC defeat lacks canonical world, chunk, or Kappa context; loot skipped');
    return false;
  }

  eventBusInstance.emitSafe('combat.defeat', context);
  return true;
}

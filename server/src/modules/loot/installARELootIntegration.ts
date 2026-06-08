'use strict';

/**
 * ARELogic Infinite Loot Machine - Integration Relay
 * 
 * Bridges the existing NPC decomposition system with the new
 * ProceduralLootMachine to generate deterministic, Diablo-2-style loot.
 * 
 * Flow:
 * NPC Decomposition → emitDeterministicLootEvent → LootDirector.handleNpcKilled → ProceduralLootMachine.generate
 */

import { bootLootSystem, getLootEventBus } from '../../bootLootSystem.js';
import type { LootDirector } from '../../bootLootSystem.js';
import { WorldTick } from '../../core/WorldTick';

const INSTALLED_KEY = Symbol.for('areloria.areLootIntegrationRelay');
const TICK_OFFSET_BASE = 1000000;

let integratedDirector: LootDirector | null = null;
let tickOffsetCounter = 0;

interface ARELootContext {
  playerId: string;
  npcId: string;
  npcType?: string;
  sourceRank?: string;
  areaLevel: number;
  treasureClassId?: string;
  position: { x: number; y: number; z: number };
  biomeId: string;
  factionId: string;
  socialString?: string;
  playerReputation?: number;
  magicFind?: number;
  killStreak?: number;
  tick: number;
}

/**
 * Emit a deterministic loot event for NPC death
 * Called when an NPC enters decomposition state
 */
export function emitDeterministicLootEvent(ctx: ARELootContext): void {
  const eventBus = getLootEventBus();
  if (!eventBus) {
    console.warn('[ARELootRelay] EventBus not initialized, skipping loot event');
    return;
  }

  // Create unique loot index to ensure deterministic but different seeds for multiple drops
  const lootIndex = (tickOffsetCounter++ % 1000) + (ctx.tick % 100) * 1000;

  eventBus.emitSafe('combat.npcKilled', {
    playerId: ctx.playerId,
    npcId: ctx.npcId,
    npcType: ctx.npcType || 'beast',
    sourceRank: ctx.sourceRank || 'NORMAL',
    areaLevel: ctx.areaLevel || 1,
    treasureClassId: ctx.treasureClassId || getTreasureClassForNpcType(ctx.npcType),
    tickIndex: ctx.tick + TICK_OFFSET_BASE + lootIndex,
    position: ctx.position,
    biomeId: ctx.biomeId || 'unknown',
    factionId: ctx.factionId || 'neutral',
    socialString: ctx.socialString || '',
    playerReputation: ctx.playerReputation || 0,
    magicFind: ctx.magicFind || 0,
    killStreak: ctx.killStreak || 0,
    lootIndex
  });
}

/**
 * Get appropriate treasure class for NPC type
 */
function getTreasureClassForNpcType(npcType?: string): string {
  if (!npcType) return 'TC_ACT1_BEAST';
  
  const type = npcType.toLowerCase();
  
  if (type.includes('boss') || type.includes('worldboss')) return 'TC_BOSS_WORLD';
  if (type.includes('elite') || type.includes('champion')) return 'TC_BOSS_WORLD';
  if (type.includes('beast') || type.includes('wolf') || type.includes('animal')) return 'TC_ACT1_BEAST';
  
  return 'TC_ACT1_BEAST';
}

/**
 * Install the ARE Loot integration into WorldTick
 * This hooks into the existing decomposition system to emit loot events
 */
export function installARELootIntegration(worldTick: WorldTick): void {
  const proto = worldTick.constructor.prototype as any;
  if (proto[INSTALLED_KEY]) return;
  proto[INSTALLED_KEY] = true;

  // Boot the loot system if not already done
  if (!integratedDirector) {
    const db = (global as any).__db || {};
    const wt = worldTick as any;
    const result = bootLootSystem({
      db,
      inventoryService: null,
      worldDropService: {
        spawnItem: (payload: any) => {
          // Bridge to WorldTick's lootEntities via any cast
          const lootEntities = wt.lootEntities;
          if (lootEntities?.set) {
            lootEntities.set(payload.item.uid, {
              id: payload.item.uid,
              position: {
                x: payload.position?.x || 0,
                y: payload.position?.y || 0,
                z: payload.position?.z || 0
              },
              item: payload.item,
              glbPath: null,
              visualType: 'loot_capsule',
              sourceNpcId: payload.item.meta?.dropSourceId,
              items: [payload.item],
              gold: payload.item.kind === 'currency' ? payload.item.amount : 0
            });
          }
        }
      },
      auditStore: null
    });
    integratedDirector = result.lootDirector;
    console.log('[ARELootRelay] Infinite Loot Machine started');
  }

  // Listen for loot.generated events and broadcast to clients
  const eventBus = getLootEventBus();
  if (eventBus) {
    const wt = worldTick as any;
    eventBus.onSafe('loot.generated', async (payload: any) => {
      // Forward to WebSocket clients
      const ws = wt.ws;
      if (ws?.broadcast) {
        ws.broadcast({
          type: 'loot.generated',
          payload
        });
      }
    });

    eventBus.onSafe('loot.telemetry', async (payload: any) => {
      const ws = wt.ws;
      const tickCount = wt.tickCount;
      if (ws?.broadcast && tickCount % 100 === 0) {
        ws.broadcast({
          type: 'loot.telemetry',
          payload
        });
      }
    });
  }
}

/**
 * Emit loot event when an NPC decomposes
 * Call this from NPCSystem.emitDecompositionResonance or WorldResonanceAdapter
 */
export function onNpcDecomposition(
  npc: { id: string; factionId?: string; state?: string; position: { x: number; y: number; z: number } },
  player: { id: string; reputation?: number; stats?: { magicFind?: number; killStreak?: number } },
  zone: { areaLevel: number; biomeId?: string; factionId?: string },
  tick: number
): void {
  emitDeterministicLootEvent({
    playerId: player.id,
    npcId: npc.id,
    npcType: npc.state,
    areaLevel: zone.areaLevel,
    position: npc.position,
    biomeId: zone.biomeId || 'unknown',
    factionId: npc.factionId || zone.factionId || 'neutral',
    playerReputation: player.reputation || 0,
    magicFind: player.stats?.magicFind || 0,
    killStreak: player.stats?.killStreak || 0,
    tick
  });
}

/**
 * Get the loot director status for admin/debugging
 */
export function getARELootStatus(): any {
  if (!integratedDirector) {
    return { initialized: false, system: 'ARE_INFINITE_LOOT_MACHINE' };
  }
  
  return {
    initialized: true,
    system: 'ARE_INFINITE_LOOT_MACHINE',
    ...integratedDirector.getStatus()
  };
}
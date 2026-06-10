'use strict';

/**
 * ARELogic Infinite Loot Machine - Integration Relay (MIGRATED)
 * 
 * This module has been migrated to use WorldTickAdapter (WorldTickThinShell).
 * The loot system is now integrated via OuroborosTickSystem.
 */

import { bootLootSystem, getLootEventBus } from '../../bootLootSystem.js';
import type { LootDirector } from '../../bootLootSystem.js';
import { worldTickAdapter } from '../../core/are/WorldTickThinShellAdapter.js';
import type { WorldTick } from '../../core/are/index.js';

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
 * Install the ARE Loot integration
 * This has been migrated to use WorldTickAdapter (WorldTickThinShell).
 * The loot system is now integrated via OuroborosTickSystem.
 */
export function installARELootIntegration(worldTick?: WorldTick): void {
  // Use worldTickAdapter if no argument provided
  const adapter = worldTick ?? worldTickAdapter;
  
  // Boot the loot system if not already done
  if (!integratedDirector) {
    const db = (global as any).__db || {};
    
    const result = bootLootSystem({
      db,
      inventoryService: null,
      worldDropService: {
        spawnItem: (payload: any) => {
          // Bridge to adapter's loot system
          // Note: The new architecture handles this via OuroborosTickSystem
          console.log('[ARELootRelay] Loot spawned via OuroborosTickSystem:', payload.item?.uid);
        }
      },
      auditStore: null
    });
    integratedDirector = result.lootDirector;
    console.log('[ARELootRelay] Infinite Loot Machine started (Migrated to WorldTickThinShell)');
  }

  // Listen for loot.generated events and broadcast to clients
  const eventBus = getLootEventBus();
  if (eventBus) {
    eventBus.onSafe('loot.generated', async (payload: any) => {
      // Forward to WebSocket clients via adapter
      console.log('[ARELootRelay] loot.generated event:', payload.item?.uid);
    });

    eventBus.onSafe('loot.telemetry', async (payload: any) => {
      const tickCount = adapter.tickCount;
      if (tickCount % 100 === 0) {
        console.log('[ARELootRelay] loot.telemetry:', payload);
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
    return { initialized: false, system: 'ARE_INFINITE_LOOT_MACHINE', note: 'Migrated to WorldTickThinShell' };
  }
  
  return {
    initialized: true,
    system: 'ARE_INFINITE_LOOT_MACHINE',
    ...integratedDirector.getStatus()
  };
}
'use strict';

import { ProceduralLootMachine } from './ProceduralLootMachine';
import { LootAxioms } from './LootAxioms';
import {
  type LootDelta,
  type LootDeltaItem,
  type LootRollContextCanonical,
  createIdempotencyKey,
  createLootSeed
} from './LootDelta';

interface LootDirectorDeps {
  db: any;
  eventBus: any;
  inventoryService?: any;
  worldDropService?: any;
  auditStore?: any;
}

/**
 * LootDirector - Context Orchestrator + Deterministic loot_delta Writer
 * 
 * CANONICAL PATH:
 * 1. Receives loot_roll_context from combat defeat events
 * 2. Delegates to ProceduralLootMachine (ARELootEngine facade)
 * 3. Writes deterministic loot_delta
 * 4. Emits loot_delta for inventory/equipment systems to consume
 * 
 * DO NOT: Roll own loot, create parallel drop truth, or emit loot before confirmed event
 */
class LootDirector {
  private db: any;
  private eventBus: any;
  private inventoryService: any;
  private worldDropService: any;
  private auditStore: any;
  private started: boolean = false;
  
  /** Idempotency guard - prevents duplicate loot for same event */
  private processedKeys = new Set<string>();
  
  /** Reference to the loot machine (ARELootEngine facade / Infinite Loot Machine) */
  private lootMachine: ProceduralLootMachine | null = null;
  private policy: any = null;

  private telemetry: any = {
    generated: 0,
    byRarity: {},
    lastSeedHash: null,
    idempotencyHits: 0
  };

  constructor({ db, eventBus, inventoryService, worldDropService, auditStore }: LootDirectorDeps) {
    this.db = db;
    this.eventBus = eventBus;
    this.inventoryService = inventoryService;
    this.worldDropService = worldDropService;
    this.auditStore = auditStore;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.eventBus.onSafe('combat.defeat', async (payload: any) => {
      await this.handleDefeatEvent(payload);
    });

    this.eventBus.onSafe('combat.npcKilled', async (payload: any) => {
      // Legacy support - convert to defeat event context
      await this.handleDefeatEvent(this.normalizeLegacyContext(payload));
    });

    this.eventBus.onSafe('world.tick', async (payload: any) => {
      await this.handleWorldTick(payload);
    });
  }

  /**
   * Normalize legacy npcKilled payload to defeat context
   */
  private normalizeLegacyContext(payload: any): LootRollContextCanonical {
    return {
      sourceEntityId: payload.playerId,
      defeatedEntityId: payload.npcId,
      actorId: payload.playerId,
      sourceTick: payload.tickIndex,
      chunkKey: payload.chunkKey || `chunk_${payload.tickIndex % 100}`,
      worldHash: payload.worldHash || 'default_world',
      chunkHash: payload.chunkHash || 'default_chunk',
      kappa: payload.kappa || payload.playerId,
      encounterId: payload.encounterId,
      lootIndex: payload.lootIndex || 0,
      treasureClassId: payload.treasureClassId || this.treasureClassForEntity(payload),
      areaLevel: payload.areaLevel || 1,
      magicFind: payload.magicFind || 0,
      killStreak: payload.killStreak || 0,
      sourceRank: payload.sourceRank || 'NORMAL',
      biomeId: payload.biomeId || 'unknown',
      factionId: payload.factionId || 'neutral',
      socialString: payload.socialString || ''
    };
  }

  /**
   * Handle defeat event - canonical loot roll entry point
   * 
   * Flow:
   * 1. Create stable LootRollContext
   * 2. Check idempotency
   * 3. Delegate to ProceduralLootMachine
   * 4. Write deterministic loot_delta
   * 5. Emit loot_delta for downstream consumption
   */
  async handleDefeatEvent(context: LootRollContextCanonical): Promise<LootDelta | null> {
    // Create idempotency key
    const idempotencyKey = createIdempotencyKey(context);
    
    // Idempotency check - prevent duplicate loot for same event
    if (this.processedKeys.has(idempotencyKey)) {
      this.telemetry.idempotencyHits++;
      console.debug('[LootDirector] Duplicate event blocked:', idempotencyKey);
      return null;
    }
    
    this.processedKeys.add(idempotencyKey);
    
    // Trim processed keys to prevent memory leak
    if (this.processedKeys.size > 10000) {
      const keysToRemove = Array.from(this.processedKeys).slice(0, 5000);
      keysToRemove.forEach(k => this.processedKeys.delete(k));
    }

    // Ensure loot machine is initialized
    if (!this.lootMachine) {
      this.policy = await this.loadPolicy();
      this.lootMachine = new ProceduralLootMachine(this.db, this.policy);
    }

    // Create deterministic seed
    const seed = createLootSeed(context);
    const seedHash = LootAxioms.shortHash(seed);

    try {
      // Delegate to ProceduralLootMachine (ARELootEngine facade / Infinite Loot Machine)
      const result = await this.lootMachine.generate({
        playerId: context.sourceEntityId,
        tickIndex: context.sourceTick,
        dropSourceId: context.defeatedEntityId,
        lootIndex: context.lootIndex,
        areaLevel: context.areaLevel,
        policyVersion: this.policy.version,
        treasureClassId: context.treasureClassId,
        magicFind: context.magicFind || 0,
        killStreak: context.killStreak || 0,
        sourceRank: context.sourceRank || 'NORMAL',
        biomeId: context.biomeId || 'unknown',
        factionId: context.factionId || 'neutral',
        socialString: context.socialString || '',
        playerReputation: 0
      });

      // Build deterministic loot_delta
      const lootDelta: LootDelta = {
        idempotencyKey,
        lootRollContext: context,
        seedHash,
        items: this.buildLootDeltaItems(result.items, context),
        createdAtTick: context.sourceTick,
        playerId: context.sourceEntityId
      };

      // Observe and record
      this.observe(lootDelta);

      if (this.auditStore?.recordDrop) {
        for (const item of lootDelta.items) {
          await this.auditStore.recordDrop(context, item);
        }
      }

      // Emit loot_delta for downstream systems (inventory, worldDropService)
      this.eventBus.emitSafe('loot.delta', {
        delta: lootDelta,
        playerId: context.sourceEntityId,
        tickIndex: context.sourceTick
      });

      // Emit legacy event for backward compatibility
      this.eventBus.emitSafe('loot.generated', {
        playerId: context.sourceEntityId,
        tickIndex: context.sourceTick,
        seedHash,
        items: lootDelta.items.map(item => ({
          uid: item.uid,
          itemId: item.itemId,
          name: item.name,
          rarity: item.rarity,
          quantity: item.quantity
        }))
      });

      return lootDelta;
    } catch (error) {
      console.error('[LootDirector] Loot generation failed:', error);
      return null;
    }
  }

  /**
   * Build stable loot_delta items from machine result
   * Items are sorted by rollHash for determinism
   */
  private buildLootDeltaItems(items: readonly any[], context: LootRollContextCanonical): readonly LootDeltaItem[] {
    const deltaItems: LootDeltaItem[] = items.map((item, index) => ({
      uid: item.uid,
      itemId: item.baseId || item.name,
      name: item.name,
      rarity: item.rarity,
      quantity: item.amount || 1,
      position: context.chunkKey ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0, z: 0 },
      rollHash: LootAxioms.shortHash(`${context.sourceTick}|${context.defeatedEntityId}|${index}|${item.uid}`)
    }));

    // Sort by rollHash for stable ordering
    deltaItems.sort((a, b) => a.rollHash.localeCompare(b.rollHash));
    return Object.freeze(deltaItems);
  }

  async handleWorldTick({ tickIndex }: { tickIndex: number }): Promise<void> {
    if (tickIndex % 100 !== 0) return;

    this.eventBus.emitSafe('loot.telemetry', {
      tickIndex,
      status: this.getStatus()
    });
  }

  observe(delta: LootDelta): void {
    this.telemetry.generated++;
    this.telemetry.lastSeedHash = delta.seedHash;

    for (const item of delta.items) {
      if (item.rarity) {
        this.telemetry.byRarity[item.rarity] = (this.telemetry.byRarity[item.rarity] || 0) + 1;
      }
    }
  }

  treasureClassForEntity(payload: any): string {
    if (payload.sourceRank === 'WORLD_BOSS') return 'TC_BOSS_WORLD';
    if (payload.npcType === 'beast') return 'TC_ACT1_BEAST';
    return 'TC_ACT1_BEAST';
  }

  async loadPolicy(): Promise<any> {
    if (this.db.models?.LootPolicy?.findOne) {
      const row = await this.db.models.LootPolicy.findOne({ active: true });
      if (row?.config) {
        return {
          version: row.version,
          ...row.config
        };
      }
    }

    return {
      version: 'loot-policy-v3',
      maxMagicFind: 500,
      maxAreaLevel: 100,
      minAreaLevel: 1
    };
  }

  getStatus(): any {
    return {
      started: this.started,
      axiomVersion: LootAxioms.VERSION,
      telemetry: this.telemetry,
      note: 'LootDirector is canonical - ProceduralLootMachine is the Infinite ARE Loot Machine'
    };
  }
}

export { LootDirector };
export type { LootRollContextCanonical, LootDelta, LootDeltaItem };
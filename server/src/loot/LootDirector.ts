'use strict';

import { ProceduralLootMachine } from './ProceduralLootMachine.js';
import { LootAxioms } from './LootAxioms.js';
import {
  type LootDelta,
  type LootDeltaItem,
  type LootRollContextCanonical,
  createIdempotencyKey,
  createLootSeed
} from './LootDelta.js';

interface LootDirectorDeps {
  db: any;
  eventBus: any;
  inventoryService?: any;
  worldDropService?: any;
  auditStore?: any;
}

const MAX_PROCESSED_KEYS = 10_000;
const TRIM_PROCESSED_KEYS_TO = 5_000;

/**
 * LootDirector - Context Orchestrator + Deterministic loot_delta Writer
 *
 * CANONICAL PATH:
 * 1. Receives canonical loot_roll_context from confirmed combat defeat events
 * 2. Delegates to ProceduralLootMachine
 * 3. Writes deterministic loot_delta
 * 4. Emits loot_delta for inventory/equipment systems to consume
 *
 * DO NOT: Roll own loot, create parallel drop truth, or emit loot before confirmed event.
 */
class LootDirector {
  private db: any;
  private eventBus: any;
  private inventoryService: any;
  private worldDropService: any;
  private auditStore: any;
  private started: boolean = false;
  private processedKeys = new Set<string>();
  private lootMachine: ProceduralLootMachine | null = null;
  private policy: any = null;

  private telemetry: any = {
    generated: 0,
    byRarity: {},
    lastSeedHash: null,
    idempotencyHits: 0,
    invalidContexts: 0,
    failedRolls: 0
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
      const context = this.normalizeLegacyContext(payload);
      if (!context) {
        this.telemetry.invalidContexts++;
        console.warn('[LootDirector] Legacy combat.npcKilled missing canonical loot context fields; loot skipped');
        return;
      }
      await this.handleDefeatEvent(context);
    });

    this.eventBus.onSafe('world.tick', async (payload: any) => {
      await this.handleWorldTick(payload);
    });
  }

  private normalizeLegacyContext(payload: any): LootRollContextCanonical | null {
    if (!payload || typeof payload !== 'object') return null;
    const sourceTick = Number(payload.tickIndex ?? payload.sourceTick);
    const sourceEntityId = this.requiredString(payload.playerId ?? payload.sourceEntityId);
    const defeatedEntityId = this.requiredString(payload.npcId ?? payload.defeatedEntityId);
    const actorId = this.requiredString(payload.actorId ?? payload.playerId ?? payload.sourceEntityId);
    const chunkKey = this.requiredString(payload.chunkKey);
    const worldHash = this.requiredString(payload.worldHash);
    const chunkHash = this.requiredString(payload.chunkHash);
    const kappa = this.requiredString(payload.kappa);

    if (!sourceEntityId || !defeatedEntityId || !actorId || !Number.isSafeInteger(sourceTick) || sourceTick < 0 || !chunkKey || !worldHash || !chunkHash || !kappa) {
      return null;
    }

    return {
      sourceEntityId,
      defeatedEntityId,
      actorId,
      sourceTick,
      chunkKey,
      worldHash,
      chunkHash,
      kappa,
      encounterId: typeof payload.encounterId === 'string' ? payload.encounterId : undefined,
      lootIndex: this.safeInteger(payload.lootIndex, 0),
      treasureClassId: this.requiredString(payload.treasureClassId) || this.treasureClassForEntity(payload),
      areaLevel: Math.max(1, this.safeInteger(payload.areaLevel, 1)),
      magicFind: Math.max(0, this.safeInteger(payload.magicFind, 0)),
      killStreak: Math.max(0, this.safeInteger(payload.killStreak, 0)),
      sourceRank: this.requiredString(payload.sourceRank) || 'NORMAL',
      biomeId: this.requiredString(payload.biomeId) || 'unknown',
      factionId: this.requiredString(payload.factionId) || 'neutral',
      socialString: typeof payload.socialString === 'string' ? payload.socialString : ''
    };
  }

  async handleDefeatEvent(rawContext: LootRollContextCanonical): Promise<LootDelta | null> {
    const context = this.normalizeCanonicalContext(rawContext);
    if (!context) {
      this.telemetry.invalidContexts++;
      console.warn('[LootDirector] combat.defeat missing canonical loot context fields; loot skipped');
      return null;
    }

    const idempotencyKey = createIdempotencyKey(context);
    if (this.processedKeys.has(idempotencyKey)) {
      this.telemetry.idempotencyHits++;
      console.debug('[LootDirector] Duplicate event blocked:', idempotencyKey);
      return null;
    }

    if (!this.lootMachine) {
      this.policy = await this.loadPolicy();
      this.lootMachine = new ProceduralLootMachine(this.db, this.policy);
    }

    const seed = createLootSeed(context);
    const seedHash = LootAxioms.shortHash(seed);

    try {
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

      const lootDelta: LootDelta = Object.freeze({
        idempotencyKey,
        lootRollContext: context,
        seedHash,
        items: this.buildLootDeltaItems(result.items, context),
        createdAtTick: context.sourceTick,
        playerId: context.sourceEntityId
      });

      this.processedKeys.add(idempotencyKey);
      this.trimProcessedKeys();
      this.observe(lootDelta);

      if (this.auditStore?.recordDrop) {
        for (const item of lootDelta.items) {
          await this.auditStore.recordDrop(context, item);
        }
      }

      this.eventBus.emitSafe('loot.delta', {
        delta: lootDelta,
        playerId: context.sourceEntityId,
        tickIndex: context.sourceTick
      });

      this.eventBus.emitSafe('loot.generated', {
        playerId: context.sourceEntityId,
        tickIndex: context.sourceTick,
        seedHash,
        items: lootDelta.items.map(item => ({
          uid: item.uid,
          itemId: item.itemId,
          name: item.name,
          rarity: item.rarity,
          quantity: item.quantity,
          rollHash: item.rollHash
        }))
      });

      return lootDelta;
    } catch (error) {
      this.telemetry.failedRolls++;
      console.error('[LootDirector] Loot generation failed:', error);
      return null;
    }
  }

  private normalizeCanonicalContext(context: LootRollContextCanonical): LootRollContextCanonical | null {
    if (!context || typeof context !== 'object') return null;
    const sourceTick = Number(context.sourceTick);
    const sourceEntityId = this.requiredString(context.sourceEntityId);
    const defeatedEntityId = this.requiredString(context.defeatedEntityId);
    const actorId = this.requiredString(context.actorId);
    const chunkKey = this.requiredString(context.chunkKey);
    const worldHash = this.requiredString(context.worldHash);
    const chunkHash = this.requiredString(context.chunkHash);
    const kappa = this.requiredString(context.kappa);
    const treasureClassId = this.requiredString(context.treasureClassId);

    if (!sourceEntityId || !defeatedEntityId || !actorId || !Number.isSafeInteger(sourceTick) || sourceTick < 0 || !chunkKey || !worldHash || !chunkHash || !kappa || !treasureClassId) {
      return null;
    }

    return Object.freeze({
      ...context,
      sourceEntityId,
      defeatedEntityId,
      actorId,
      sourceTick,
      chunkKey,
      worldHash,
      chunkHash,
      kappa,
      lootIndex: this.safeInteger(context.lootIndex, 0),
      treasureClassId,
      areaLevel: Math.max(1, this.safeInteger(context.areaLevel, 1)),
      magicFind: Math.max(0, this.safeInteger(context.magicFind, 0)),
      killStreak: Math.max(0, this.safeInteger(context.killStreak, 0)),
      sourceRank: this.requiredString(context.sourceRank) || 'NORMAL',
      biomeId: this.requiredString(context.biomeId) || 'unknown',
      factionId: this.requiredString(context.factionId) || 'neutral',
      socialString: typeof context.socialString === 'string' ? context.socialString : ''
    });
  }

  private buildLootDeltaItems(items: readonly any[], context: LootRollContextCanonical): readonly LootDeltaItem[] {
    const deltaItems: LootDeltaItem[] = items.map((item, index) => ({
      uid: String(item.uid),
      itemId: String(item.baseId || item.itemId || item.name),
      name: String(item.name || item.baseId || item.uid),
      rarity: String(item.rarity || 'COMMON'),
      quantity: Math.max(1, this.safeInteger(item.amount ?? item.quantity, 1)),
      position: { x: 0, y: 0, z: 0 },
      rollHash: LootAxioms.shortHash(`${context.worldHash}|${context.chunkHash}|${context.sourceTick}|${context.defeatedEntityId}|${context.lootIndex}|${index}|${item.uid}`)
    }));

    deltaItems.sort((a, b) => a.rollHash.localeCompare(b.rollHash) || a.uid.localeCompare(b.uid));
    return Object.freeze(deltaItems.map((item) => Object.freeze(item)));
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

  private trimProcessedKeys(): void {
    if (this.processedKeys.size <= MAX_PROCESSED_KEYS) return;
    const keysToRemove = Array.from(this.processedKeys).slice(0, Math.max(0, this.processedKeys.size - TRIM_PROCESSED_KEYS_TO));
    keysToRemove.forEach((key) => this.processedKeys.delete(key));
  }

  private requiredString(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
  }

  private safeInteger(value: unknown, fallback: number): number {
    const next = Number(value);
    return Number.isSafeInteger(next) ? next : fallback;
  }
}

export { LootDirector };
export type { LootRollContextCanonical, LootDelta, LootDeltaItem };

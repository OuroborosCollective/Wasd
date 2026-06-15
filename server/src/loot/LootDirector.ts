'use strict';

import { LootAxioms } from './LootAxioms.js';
import { createItemGenerationAuthority, type ItemGenerationAuthority } from './ItemGenerationAuthority.js';
import {
  type LootDelta,
  type LootDeltaItem,
  type LootRollContextCanonical,
  createIdempotencyKey
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
const LEGACY_CHUNK_SIZE = 64;

class LootDirector {
  private db: any;
  private eventBus: any;
  private inventoryService: any;
  private worldDropService: any;
  private auditStore: any;
  private started: boolean = false;
  private processedKeys = new Set<string>();
  private itemAuthority: ItemGenerationAuthority | null = null;
  private policy: any = null;

  private telemetry: any = {
    generated: 0,
    byRarity: {},
    lastSeedHash: null,
    idempotencyHits: 0,
    invalidContexts: 0,
    failedRolls: 0,
    persistedDeltas: 0,
    noConsumerDeltas: 0
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
        console.warn('[LootDirector] Legacy combat.npcKilled missing stable player/npc/tick fields; loot skipped');
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

    if (!sourceEntityId || !defeatedEntityId || !actorId || !Number.isSafeInteger(sourceTick) || sourceTick < 0) {
      return null;
    }

    const spatial = this.deriveLegacySpatialContext(payload, sourceEntityId, defeatedEntityId, sourceTick);

    return Object.freeze({
      sourceEntityId,
      defeatedEntityId,
      actorId,
      sourceTick,
      chunkKey: this.requiredString(payload.chunkKey) || spatial.chunkKey,
      worldHash: this.requiredString(payload.worldHash) || spatial.worldHash,
      chunkHash: this.requiredString(payload.chunkHash) || spatial.chunkHash,
      kappa: this.requiredString(payload.kappa) || spatial.kappa,
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
    });
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

    if (!this.itemAuthority) {
      this.policy = await this.loadPolicy();
      this.itemAuthority = createItemGenerationAuthority({ db: this.db, policy: this.policy });
    }

    try {
      const result = await this.itemAuthority.generate({
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
        seedHash: result.seedHash,
        items: this.buildLootDeltaItems(result.items, context),
        createdAtTick: context.sourceTick,
        playerId: context.sourceEntityId
      });

      await this.applyLootDelta(lootDelta);

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
        seedHash: result.seedHash,
        authorityId: result.authorityId,
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

  private buildLootDeltaItems(items: readonly unknown[], context: LootRollContextCanonical): readonly LootDeltaItem[] {
    const deltaItems: LootDeltaItem[] = items.map((item, index) => {
      const itemRecord = item && typeof item === 'object' ? item as Record<string, any> : {};
      const itemId = this.resolveDeltaItemId(itemRecord);
      const name = this.resolveDeltaItemName(itemRecord, itemId);
      const uid = this.requiredString(itemRecord.uid) || `loot-${LootAxioms.shortHash(`${context.worldHash}|${context.chunkHash}|${context.sourceTick}|${itemId}|${index}`, 24)}`;

      return {
        uid,
        itemId,
        name,
        rarity: String(itemRecord.rarity || (itemRecord.kind === 'currency' ? 'CURRENCY' : 'COMMON')),
        quantity: Math.max(1, this.safeInteger(itemRecord.amount ?? itemRecord.quantity, 1)),
        position: { x: 0, y: 0, z: 0 },
        rollHash: LootAxioms.shortHash(`${context.worldHash}|${context.chunkHash}|${context.sourceTick}|${context.defeatedEntityId}|${context.lootIndex}|${index}|${uid}|${itemId}`)
      };
    });

    deltaItems.sort((a, b) => a.rollHash.localeCompare(b.rollHash) || a.uid.localeCompare(b.uid));
    return Object.freeze(deltaItems.map((item) => Object.freeze(item)));
  }

  private async applyLootDelta(delta: LootDelta): Promise<void> {
    let consumed = false;

    if (this.inventoryService?.addItem) {
      for (const item of delta.items) {
        await this.inventoryService.addItem({
          playerId: delta.playerId,
          itemId: item.itemId,
          quantity: item.quantity
        });
      }
      consumed = true;
    }

    if (this.worldDropService?.spawnItem) {
      for (const item of delta.items) {
        await this.worldDropService.spawnItem({
          playerId: delta.playerId,
          item,
          delta,
          tickIndex: delta.createdAtTick,
          position: item.position
        });
      }
      consumed = true;
    }

    if (consumed) {
      this.telemetry.persistedDeltas++;
    } else {
      this.telemetry.noConsumerDeltas++;
      console.warn('[LootDirector] loot_delta generated without inventory/world-drop consumer:', delta.idempotencyKey);
    }
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
      itemGenerationAuthority: 'procedural-loot-machine.v1',
      telemetry: this.telemetry,
      note: 'LootDirector is canonical - item generation runs through ItemGenerationAuthority'
    };
  }

  private deriveLegacySpatialContext(payload: any, sourceEntityId: string, defeatedEntityId: string, sourceTick: number): {
    chunkKey: string;
    worldHash: string;
    chunkHash: string;
    kappa: string;
  } {
    const position = payload.position && typeof payload.position === 'object' ? payload.position : {};
    const x = Math.floor(Number(position.x || 0));
    const z = Math.floor(Number(position.z || 0));
    const chunkX = Math.floor(x / LEGACY_CHUNK_SIZE);
    const chunkZ = Math.floor(z / LEGACY_CHUNK_SIZE);
    const biomeId = this.requiredString(payload.biomeId) || 'unknown';
    const factionId = this.requiredString(payload.factionId) || 'neutral';
    const chunkKey = `legacy:${chunkX}:${chunkZ}`;
    const worldHash = `legacy-world-${LootAxioms.shortHash(`${biomeId}|${factionId}`, 16)}`;
    const chunkHash = `legacy-chunk-${LootAxioms.shortHash(`${chunkKey}|${defeatedEntityId}|${sourceTick}`, 16)}`;
    const kappa = `legacy-kappa-${LootAxioms.shortHash(`${sourceEntityId}|${defeatedEntityId}|${sourceTick}|${chunkKey}`, 16)}`;
    return { chunkKey, worldHash, chunkHash, kappa };
  }

  private resolveDeltaItemId(item: Record<string, any>): string {
    return this.requiredString(item.baseId)
      || this.requiredString(item.itemId)
      || this.requiredString(item.currency)
      || this.requiredString(item.name)
      || 'unknown-loot-item';
  }

  private resolveDeltaItemName(item: Record<string, any>, itemId: string): string {
    return this.requiredString(item.name)
      || this.requiredString(item.currency)
      || itemId;
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

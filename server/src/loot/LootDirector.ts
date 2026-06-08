'use strict';

import { ProceduralLootMachine } from './ProceduralLootMachine';
import { LootAxioms } from './LootAxioms';

interface LootDirectorDeps {
  db: any;
  eventBus: any;
  inventoryService?: any;
  worldDropService?: any;
  auditStore?: any;
}

class LootDirector {
  private db: any;
  private eventBus: any;
  private inventoryService: any;
  private worldDropService: any;
  private auditStore: any;
  private started: boolean = false;
  private telemetry: any = {
    generated: 0,
    byRarity: {},
    lastSeedHash: null
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

    this.eventBus.onSafe('combat.npcKilled', async (payload: any) => {
      await this.handleNpcKilled(payload);
    });

    this.eventBus.onSafe('world.tick', async (payload: any) => {
      await this.handleWorldTick(payload);
    });
  }

  async handleNpcKilled(payload: any): Promise<any> {
    const policy = await this.loadPolicy();
    const machine = new ProceduralLootMachine(this.db, policy);

    const result = await machine.generate({
      playerId: payload.playerId,
      tickIndex: payload.tickIndex,
      dropSourceId: payload.npcId,
      lootIndex: payload.lootIndex || 0,
      areaLevel: payload.areaLevel,
      policyVersion: policy.version,
      treasureClassId: payload.treasureClassId || this.treasureClassForNpc(payload),
      magicFind: payload.magicFind || 0,
      killStreak: payload.killStreak || 0,
      sourceRank: payload.sourceRank || 'NORMAL',
      biomeId: payload.biomeId || 'unknown',
      factionId: payload.factionId || 'neutral',
      socialString: payload.socialString || '',
      playerReputation: payload.playerReputation || 0
    });

    for (const item of result.items) {
      this.observe(item, result.seedHash);

      if (this.auditStore?.recordDrop) {
        await this.auditStore.recordDrop(result.context, item);
      }

      if (this.worldDropService?.spawnItem) {
        await this.worldDropService.spawnItem({
          item,
          position: payload.position,
          ownerPlayerId: payload.playerId,
          tickIndex: payload.tickIndex
        });
      } else if (this.inventoryService?.addItem && item.kind === 'item') {
        await this.inventoryService.addItem(payload.playerId, item);
      }
    }

    this.eventBus.emitSafe('loot.generated', {
      playerId: payload.playerId,
      tickIndex: payload.tickIndex,
      seedHash: result.seedHash,
      items: result.items.map((item: any) => ({
        uid: item.uid,
        kind: item.kind,
        name: item.name,
        rarity: item.rarity,
        amount: item.amount,
        currency: item.currency
      }))
    });

    return result;
  }

  async handleWorldTick({ tickIndex }: { tickIndex: number }): Promise<void> {
    if (tickIndex % 100 !== 0) return;

    this.eventBus.emitSafe('loot.telemetry', {
      tickIndex,
      status: this.getStatus()
    });
  }

  observe(item: any, seedHash: string): void {
    this.telemetry.generated++;
    this.telemetry.lastSeedHash = seedHash;

    if (item.rarity) {
      this.telemetry.byRarity[item.rarity] = (this.telemetry.byRarity[item.rarity] || 0) + 1;
    }
  }

  treasureClassForNpc(payload: any): string {
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
      telemetry: this.telemetry
    };
  }
}

export { LootDirector };
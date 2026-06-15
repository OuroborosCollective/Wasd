'use strict';

import { describe, expect, it } from 'vitest';
import { ITEM_GENERATION_AUTHORITY_ID, createItemGenerationAuthority } from '../loot/ItemGenerationAuthority.js';
import { LootDirector } from '../loot/LootDirector.js';

function createFakeDb() {
  return {
    models: {
      ItemBase: {
        async find() {
          return [{
            id: 'test_blade',
            name: 'Test Blade',
            type: 'weapon',
            minLevel: 1,
            maxLevel: 99,
            reqStr: 1,
            reqInt: 0,
            reqDex: 0,
            icon: 'test_blade.png',
            baseStats: { damageMin: 2, damageMax: 5 }
          }];
        }
      },
      AffixPool: {
        async find() {
          return [{
            id: 'pre_clear',
            name: 'Clear',
            stat: 'damageMax',
            type: 'flat',
            minRoll: 1,
            maxRoll: 3,
            requiredLevel: 1,
            group: 'damage_flat',
            isPrefix: true,
            weight: 100
          }];
        }
      }
    }
  };
}

function request() {
  return {
    playerId: 'player_authority',
    tickIndex: 1234,
    dropSourceId: 'npc_authority',
    lootIndex: 0,
    areaLevel: 12,
    treasureClassId: 'TC_ACT1_BEAST',
    magicFind: 25,
    killStreak: 2,
    sourceRank: 'NORMAL',
    biomeId: 'forest',
    factionId: 'neutral',
    socialString: 'test',
    playerReputation: 0
  };
}

function createEventBus() {
  const handlers = new Map<string, Array<(payload: unknown) => void | Promise<void>>>();
  const emitted: Array<{ event: string; payload: any }> = [];
  return {
    emitted,
    onSafe(event: string, handler: (payload: unknown) => void | Promise<void>) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    },
    emitSafe(event: string, payload: any) {
      emitted.push({ event, payload });
      for (const handler of handlers.get(event) ?? []) {
        void handler(payload);
      }
    }
  };
}

describe('ItemGenerationAuthority', () => {
  it('is the production facade over deterministic procedural item creation', async () => {
    const authority = createItemGenerationAuthority({ db: createFakeDb() });
    const a = await authority.generate(request());
    const b = await authority.generate(request());

    expect(a.authorityId).toBe(ITEM_GENERATION_AUTHORITY_ID);
    expect(b.authorityId).toBe(ITEM_GENERATION_AUTHORITY_ID);
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.items).toEqual(b.items);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it('keeps loot director output tied to the authority id', async () => {
    const eventBus = createEventBus();
    const inventoryWrites: unknown[] = [];
    const director = new LootDirector({
      db: createFakeDb(),
      eventBus,
      inventoryService: {
        async addItem(payload: unknown) {
          inventoryWrites.push(payload);
        }
      }
    });

    director.start();
    const delta = await director.handleDefeatEvent({
      sourceEntityId: 'player_authority',
      defeatedEntityId: 'npc_authority',
      actorId: 'player_authority',
      sourceTick: 1234,
      chunkKey: 'chunk:1:2',
      worldHash: 'world_hash',
      chunkHash: 'chunk_hash',
      kappa: 'kappa_hash',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 12,
      magicFind: 25,
      killStreak: 2,
      sourceRank: 'NORMAL',
      biomeId: 'forest',
      factionId: 'neutral',
      socialString: 'test'
    });

    expect(delta).not.toBeNull();
    expect(inventoryWrites.length).toBeGreaterThan(0);
    const generated = eventBus.emitted.find((entry) => entry.event === 'loot.generated');
    expect(generated?.payload.authorityId).toBe(ITEM_GENERATION_AUTHORITY_ID);
  });
});

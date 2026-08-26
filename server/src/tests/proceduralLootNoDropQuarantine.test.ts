import { describe, expect, it } from 'vitest';
import { ProceduralLootMachine } from '../../src/loot/ProceduralLootMachine.js';

function createDbWithoutItemBase() {
  return {
    models: {
      TreasureClass: {
        async findOne() {
          return {
            id: 'TC_ONLY_MISSING_BASE',
            rolls: 1,
            noDropWeight: 0,
            entries: [
              { type: 'baseType', id: 'weapon.absent', weight: 1 },
            ],
          };
        },
      },
      ItemBase: {
        async find() {
          return [];
        },
      },
      AffixPool: {
        async find() {
          return [];
        },
      },
    },
  };
}

describe('ProceduralLootMachine no-drop quarantine', () => {
  it('does not manufacture an item when ItemBase content is absent', async () => {
    const machine = new ProceduralLootMachine(createDbWithoutItemBase());

    const result = await machine.generate({
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      lootIndex: 0,
      areaLevel: 10,
      treasureClassId: 'TC_ONLY_MISSING_BASE',
    });

    expect(result.items).toEqual([]);
    expect(result.quarantine).toHaveLength(1);
    expect(result.quarantine[0]).toMatchObject({
      kind: 'loot_quarantine',
      code: 'ITEM_BASE_MISSING',
      action: 'NO_DROP',
      requestedBaseType: 'weapon.absent',
    });
  });
});

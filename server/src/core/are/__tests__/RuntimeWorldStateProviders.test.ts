import { describe, expect, it } from 'vitest';
import {
  CompositeWorldStateProvider,
  GameplayAuthorityWorldStateProvider,
  RuntimeAuthorityListProvider,
  type RuntimeAuthorityListPort,
} from '../RuntimeWorldStateProviders.js';
import { createDefaultTickContext } from '../TickSystem.js';

function listPort(values: readonly unknown[]): RuntimeAuthorityListPort {
  return {
    getAll: () => values,
  };
}

describe('RuntimeWorldStateProviders', () => {
  it('maps gameplay ports into ARE world-state slices without fallback truth', () => {
    const provider = new GameplayAuthorityWorldStateProvider({
      inventory: listPort([{ id: 'inv-1' }]),
      equipment: listPort([{ id: 'eq-1' }]),
      resources: listPort([{ id: 'node-1' }]),
      housing: listPort([{ id: 'house-1' }]),
      kingdoms: listPort([{ id: 'kingdom-1' }]),
      population: listPort([{ id: 'npc-child-1' }]),
      help: listPort([{ id: 'hint-1' }]),
    });

    const slice = provider.getWorldState(createDefaultTickContext(1));

    expect(slice.inventory).toEqual([{ id: 'inv-1' }]);
    expect(slice.equipment).toEqual([{ id: 'eq-1' }]);
    expect(slice.resources).toEqual([{ id: 'node-1' }]);
    expect(slice.housing).toEqual([{ id: 'house-1' }]);
    expect(slice.kingdoms).toEqual([{ id: 'kingdom-1' }]);
    expect(slice.population).toEqual([{ id: 'npc-child-1' }]);
    expect(slice.help).toEqual([{ id: 'hint-1' }]);
    expect(slice.loot).toBeUndefined();
  });

  it('adapts a single runtime list into a named slice', () => {
    const provider = new RuntimeAuthorityListProvider(
      'equipment-authority',
      'equipment',
      listPort([{ slot: 'main', uid: 'item-1' }]),
    );

    expect(provider.getWorldState(createDefaultTickContext(2))).toEqual({
      equipment: [{ slot: 'main', uid: 'item-1' }],
    });
  });

  it('merges extended slices through the composite provider', () => {
    const composite = new CompositeWorldStateProvider('release-composite', [
      new RuntimeAuthorityListProvider('inventory-authority', 'inventory', listPort([{ id: 'i1' }])),
      new RuntimeAuthorityListProvider('resource-authority', 'resources', listPort([{ id: 'r1' }])),
      new RuntimeAuthorityListProvider('kingdom-authority', 'kingdoms', listPort([{ id: 'k1' }])),
    ]);

    expect(composite.getWorldState(createDefaultTickContext(3))).toEqual({
      inventory: [{ id: 'i1' }],
      resources: [{ id: 'r1' }],
      kingdoms: [{ id: 'k1' }],
    });
  });

  it('rejects empty provider identifiers', () => {
    expect(() => new RuntimeAuthorityListProvider('', 'inventory', listPort([]))).toThrow(
      'RuntimeAuthorityListProvider requires a stable non-empty id',
    );
  });
});

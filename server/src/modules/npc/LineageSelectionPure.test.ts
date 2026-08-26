import { describe, expect, it } from 'vitest';
import { selectLineageInputs } from './LineageSelectionPure';

describe('selectLineageInputs', () => {
  it('returns no selection for full settlements', () => {
    const result = selectLineageInputs({
      tick: 10,
      settlements: [{ id: 's1', tick: 10, population: 2, capacity: 2, foodSupply: 10 }],
      houses: [{ id: 'h1', settlementId: 's1', isActive: true }],
      actors: [
        { id: 'a1', settlementId: 's1', houseId: 'h1' },
        { id: 'a2', settlementId: 's1', houseId: 'h1' },
      ],
    });

    expect(result).toEqual([]);
  });

  it('returns stable sorted ids for the same runtime state', () => {
    const input = {
      tick: 20,
      settlements: [{ id: 's1', tick: 20, population: 1, capacity: 4, foodSupply: 10 }],
      houses: [{ id: 'h1', settlementId: 's1', isActive: true }],
      actors: [
        { id: 'b', settlementId: 's1', houseId: 'h1' },
        { id: 'a', settlementId: 's1', houseId: 'h1' },
      ],
    };

    expect(selectLineageInputs(input)).toEqual(selectLineageInputs(input));
    expect(selectLineageInputs(input)[0]).toMatchObject({ firstActorId: 'a', secondActorId: 'b', houseId: 'h1' });
  });
});

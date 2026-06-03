import { describe, expect, it } from 'vitest';
import { FactionEngine, FACTION_TICK_HZ } from './factionEngine.js';

function makeGrid(size, type = 'plains') {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type }))
  );
}

describe('FactionEngine deterministic 10Hz simulation', () => {
  it('returns stable checksums for identical tick inputs', () => {
    const engine = new FactionEngine(8, { noisePermille: 12 });
    const grid = makeGrid(8);
    const factions = [
      { id: 'wolves', x: 2, y: 2, power: 9, expansionRate: 1.2, traits: { militarist: true } },
      { id: 'owls', x: 5, y: 5, power: 9, expansionRate: 1.2, traits: { magical: true } }
    ];
    const leylineNodes = [{ id: 'root', x: 4, y: 4, influenceRadius: 3, intensity: 1.5 }];

    const a = engine.simulateFactionTick({ factions, grid, leylineNodes, tick: 120, worldSeed: 1337 });
    const b = engine.simulateFactionTick({ factions, grid, leylineNodes, tick: 120, worldSeed: 1337 });

    expect(a.tickHz).toBe(FACTION_TICK_HZ);
    expect(a.checksum).toBe(b.checksum);
    expect(a.factionStats).toEqual(b.factionStats);
  });

  it('keeps the legacy influence map API readable', () => {
    const engine = new FactionEngine(5, { noisePermille: 0 });
    const grid = makeGrid(5, 'forest');
    const influence = engine.calculateInfluenceMap([
      { id: 'guild_a', x: 2, y: 2, power: 6, expansionRate: 1 }
    ], grid);

    expect(engine.getDominantFactionAt(2, 2, influence)).toBe('guild_a');
    expect(engine.getInfluenceStrengthAt(2, 2, influence)).toBeGreaterThan(0);
  });

  it('reduces yield on contested frontier cells', () => {
    const engine = new FactionEngine(7, { noisePermille: 0, contestThreshold: 999 });
    const grid = makeGrid(7, 'plains');
    const influence = engine.calculateInfluenceMap([
      { id: 'north', x: 2, y: 3, power: 8, expansionRate: 1.1 },
      { id: 'south', x: 4, y: 3, power: 8, expansionRate: 1.1 }
    ], grid);

    const stats = engine.calculateTotalYield('north', influence, grid, []);
    expect(stats.cells).toBeGreaterThan(0);
    expect(stats.contestedCells).toBeGreaterThan(0);
  });
});

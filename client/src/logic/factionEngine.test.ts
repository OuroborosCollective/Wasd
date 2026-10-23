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

  it('benchmarks fast relational string comparison vs localeCompare for faction sorting', () => {
    const sampleFactions = Array.from({ length: 1000 }, (_, i) => ({
      id: `faction_realm_${String((i * 37) % 1000).padStart(4, '0')}_node_${String((i * 91) % 500).padStart(4, '0')}`,
      x: i % 10,
      y: i % 10,
      power: 10,
      expansionRate: 1
    }));

    const iterations = 200;

    // 1. Benchmark localeCompare sorting
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...sampleFactions].sort((a, b) => a.id.localeCompare(b.id));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark fast direct relational operator sorting
    const startRelational = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...sampleFactions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    const durationRelational = performance.now() - startRelational;

    const speedup = durationLocale / durationRelational;
    console.log(`\n⚡ FactionEngine Sorting Benchmark (${sampleFactions.length} items, ${iterations} iterations):`);
    console.log(`  - localeCompare sort:    ${durationLocale.toFixed(4)}ms`);
    console.log(`  - fast relational sort:  ${durationRelational.toFixed(4)}ms`);
    console.log(`  - Speedup factor:        ${speedup.toFixed(2)}x faster\n`);

    const sortedLocale = [...sampleFactions].sort((a, b) => a.id.localeCompare(b.id));
    const sortedRelational = [...sampleFactions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    expect(sortedRelational).toEqual(sortedLocale);
  });
});

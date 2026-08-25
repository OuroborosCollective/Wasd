import { beforeEach, describe, expect, test } from 'vitest';
import { AtmosphereMapper } from '../AtmosphereMapper';
import { TraitResonanceEngine } from '../TraitResonanceEngine';

describe('AtmosphereMapper', () => {
    let engine: TraitResonanceEngine;
    let mapper: AtmosphereMapper;
    const GRID_SIZE = 64;

    beforeEach(() => {
        engine = new TraitResonanceEngine();
        mapper = new AtmosphereMapper(engine);
    });

    const createEmptyGrid = (size = GRID_SIZE) => Array.from(
        { length: size },
        () => Array.from({ length: size }, () => ({ aggression_avg: 0, faith_avg: 0 })),
    );

    test('transforms a canonical 64x64 aggregate grid into a 64x64 heatmap', () => {
        const heatmap = mapper.generateHeatmap(createEmptyGrid());

        expect(heatmap).toHaveLength(GRID_SIZE);
        expect(heatmap[0]).toHaveLength(GRID_SIZE);
    });

    test('maps maximum faith to maximum resonance when aggression is absent', () => {
        const grid = createEmptyGrid();
        grid[32][32] = { aggression_avg: 0, faith_avg: 1 };

        expect(mapper.generateHeatmap(grid)[32][32]).toBe(1);
    });

    test('damps faith resonance completely at maximum aggression', () => {
        const grid = createEmptyGrid();
        grid[10][10] = { aggression_avg: 1, faith_avg: 1 };

        expect(mapper.generateHeatmap(grid)[10][10]).toBe(0);
    });

    test('preserves spatial placement without adding falloff', () => {
        const grid = createEmptyGrid();
        grid[0][0] = { aggression_avg: 0, faith_avg: 1 };
        grid[63][63] = { aggression_avg: 0.5, faith_avg: 1 };

        const heatmap = mapper.generateHeatmap(grid);
        expect(heatmap[0][0]).toBe(1);
        expect(heatmap[63][63]).toBe(0.5);
        expect(heatmap[31][31]).toBe(0);
    });

    test('rejects grids that are not 64x64', () => {
        expect(() => mapper.generateHeatmap(createEmptyGrid(32))).toThrow(/64x64/);
    });
});

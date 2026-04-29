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

    const createEmptyGrid = (size: number): any[][] => {
        return Array.from({ length: size }, () => 
            Array.from({ length: size }, () => ({
                traits: { aggression: 0, faith: 0, joy: 0, sorrow: 0 }
            }))
        );
    };

    test('should transform a 64x64 input grid into a 64x64 heatmap', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        const heatmap = mapper.mapToHeatmap(inputGrid);

        expect(heatmap.length).toBe(GRID_SIZE);
        expect(heatmap[0].length).toBe(GRID_SIZE);
        expect(Array.isArray(heatmap)).toBe(true);
        expect(Array.isArray(heatmap[0])).toBe(true);
    });

    test('should reflect maximum aggression resonance at boundary values', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        
        // Set an agent with max aggression at a specific coordinate
        inputGrid[32][32].traits.aggression = 1.0;
        
        const heatmap = mapper.mapToHeatmap(inputGrid);
        const intensity = heatmap[32][32];

        // The engine should produce maximum resonance for 1.0 trait
        const expectedMaxResonance = engine.calculateResonance({ aggression: 1.0, faith: 0, joy: 0, sorrow: 0 });
        
        expect(intensity).toBeCloseTo(expectedMaxResonance, 5);
        expect(intensity).toBeGreaterThan(0.5); // Threshold check for high aggression
    });

    test('should reflect maximum faith resonance at boundary values', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        
        // Set an agent with max faith
        inputGrid[10][10].traits.faith = 1.0;
        
        const heatmap = mapper.mapToHeatmap(inputGrid);
        const intensity = heatmap[10][10];

        const expectedMaxResonance = engine.calculateResonance({ aggression: 0, faith: 1.0, joy: 0, sorrow: 0 });
        
        expect(intensity).toBeCloseTo(expectedMaxResonance, 5);
    });

    test('should handle minimal boundary values (zero traits)', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        const heatmap = mapper.mapToHeatmap(inputGrid);

        // All values should be 0 or base atmosphere level
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                expect(heatmap[y][x]).toBe(0);
            }
        }
    });

    test('should correctly interpolate values across the grid', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        inputGrid[0][0].traits.aggression = 1.0;
        inputGrid[63][63].traits.faith = 1.0;

        const heatmap = mapper.mapToHeatmap(inputGrid);

        expect(heatmap[0][0]).toBeGreaterThan(0);
        expect(heatmap[63][63]).toBeGreaterThan(0);
        expect(heatmap[31][31]).toBe(0); // Assuming no fall-off logic in mapper yet, just direct mapping
    });

    test('should maintain spatial integrity during transformation', () => {
        const inputGrid = createEmptyGrid(GRID_SIZE);
        const testCoords = [[0, 0], [63, 63], [32, 15], [7, 42]];
        
        testCoords.forEach(([y, x]) => {
            inputGrid[y][x].traits.aggression = 0.5;
        });

        const heatmap = mapper.mapToHeatmap(inputGrid);

        testCoords.forEach(([y, x]) => {
            expect(heatmap[y][x]).toBeGreaterThan(0);
        });
    });

    test('should throw error if input grid size is not 64x64', () => {
        const invalidGrid = createEmptyGrid(32);
        expect(() => mapper.mapToHeatmap(invalidGrid)).toThrow();
    });
});
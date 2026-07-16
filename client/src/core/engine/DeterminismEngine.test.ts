import { describe, it, expect } from 'vitest';
import { DeterminismEngine, type AREState, type Vector } from './DeterminismEngine';

describe('DeterminismEngine Optimization and Correctness', () => {
    const initialState: AREState = {
        position: { x: 1.0, y: 2.0, z: 3.0 },
        velocity: { x: 0.1, y: 0.2, z: 0.3 },
        acceleration: { x: 0.0, y: 0.0, z: 0.0 },
        tick: 42,
        checksum: 'abc1234'
    };

    const inputStack: Vector[] = [
        { x: 1.0, y: 0.0, z: 0.0 },
        { x: 0.0, y: 1.0, z: 0.0 }
    ];

    it('should compute states correctly and deterministically', () => {
        const engine = new DeterminismEngine();
        const result = engine.computeState(initialState, inputStack);

        expect(result.tick).toBe(44);
        expect(result.position).toBeDefined();
        expect(result.velocity).toBeDefined();
        expect(result.acceleration).toBeDefined();
        expect(result.checksum).toBeDefined();
        expect(Object.isFrozen(result)).toBe(true);
    });

    it('should preserve type-safety and exact values during cloning', () => {
        const engine = new DeterminismEngine();

        // Accessing the private clone method via cast
        const cloned = (engine as any).clone(initialState) as AREState;

        expect(cloned).toEqual(initialState);
        expect(cloned).not.toBe(initialState);
        expect(cloned.position).not.toBe(initialState.position);
        expect(cloned.velocity).not.toBe(initialState.velocity);
        expect(cloned.acceleration).not.toBe(initialState.acceleration);
    });

    it('should fallback correctly for non-AREState objects during cloning', () => {
        const engine = new DeterminismEngine();

        const otherObj = {
            someRandomKey: 'hello',
            nested: { value: 123 }
        };

        const cloned = (engine as any).clone(otherObj);
        expect(cloned).toEqual(otherObj);
        expect(cloned).not.toBe(otherObj);
        expect(cloned.nested).not.toBe(otherObj.nested);
    });

    it('should be significantly faster than JSON.parse(JSON.stringify())', () => {
        const engine = new DeterminismEngine();
        const iterations = 50000;

        // Warm up
        for (let i = 0; i < 1000; i++) {
            JSON.parse(JSON.stringify(initialState));
            (engine as any).clone(initialState);
        }

        // Measure JSON parsing
        const startJson = performance.now();
        for (let i = 0; i < iterations; i++) {
            JSON.parse(JSON.stringify(initialState));
        }
        const endJson = performance.now();
        const jsonTime = endJson - startJson;

        // Measure Optimized cloning
        const startOptimized = performance.now();
        for (let i = 0; i < iterations; i++) {
            (engine as any).clone(initialState);
        }
        const endOptimized = performance.now();
        const optimizedTime = endOptimized - startOptimized;

        console.log(`[Benchmark] JSON.parse(JSON.stringify): ${jsonTime.toFixed(2)}ms`);
        console.log(`[Benchmark] Optimized cloning: ${optimizedTime.toFixed(2)}ms`);
        console.log(`[Benchmark] Speedup Factor: ${(jsonTime / optimizedTime).toFixed(2)}x`);

        expect(optimizedTime).toBeLessThan(jsonTime);
    });
});

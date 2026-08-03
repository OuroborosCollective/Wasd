import { describe, expect, it } from "vitest";
import { DeterminismEngine, AREState } from "./DeterminismEngine";

describe("DeterminismEngine", () => {
    it("should compute state correctly and deterministically", () => {
        const engine = new DeterminismEngine();
        const initialState: AREState = {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 1, y: 1, z: 1 },
            acceleration: { x: 0, y: 0, z: 0 },
            tick: 0,
            checksum: ""
        };

        const inputStack = [
            { x: 10, y: 0, z: 0 },
            { x: 0, y: 10, z: 0 },
            { x: 0, y: 0, z: 10 }
        ];

        const finalState = engine.computeState(initialState, inputStack);
        expect(finalState.tick).toBe(3);
        expect(finalState.position.x).toBeGreaterThan(0);
        expect(Object.isFrozen(finalState)).toBe(true);
        expect(Object.isFrozen(finalState.position)).toBe(true);
    });

    it("should benchmark cloning performance", () => {
        const engine = new DeterminismEngine();
        const initialState: AREState = {
            position: { x: 10.5, y: -20.2, z: 100.1 },
            velocity: { x: 1.5, y: 2.5, z: -3.5 },
            acceleration: { x: 0.1, y: -0.2, z: 0.3 },
            tick: 42,
            checksum: "abc"
        };

        // 1. JSON.parse(JSON.stringify) benchmark
        const startJSON = performance.now();
        for (let i = 0; i < 50000; i++) {
            JSON.parse(JSON.stringify(initialState));
        }
        const endJSON = performance.now();
        const jsonTime = endJSON - startJSON;

        // 2. Optimized clone benchmark (accessing via engine.clone)
        const startOpt = performance.now();
        for (let i = 0; i < 50000; i++) {
            (engine as any).clone(initialState);
        }
        const endOpt = performance.now();
        const optTime = endOpt - startOpt;

        console.log(`JSON.parse(JSON.stringify) for 50k clones: ${jsonTime.toFixed(2)}ms`);
        console.log(`Optimized manual property spread clone for 50k clones: ${optTime.toFixed(2)}ms`);
        console.log(`Speedup: ${(jsonTime / optTime).toFixed(2)}x`);

        expect(optTime).toBeLessThan(jsonTime);
    });
});

import { describe, expect, it } from "vitest";
import { DeterminismEngine, AREState, Vector } from "./DeterminismEngine";

describe("DeterminismEngine Performance and Correctness", () => {
    const initialState: AREState = {
        position: { x: 1.0, y: 2.0, z: 3.0 },
        velocity: { x: 0.1, y: 0.2, z: 0.3 },
        acceleration: { x: 0.0, y: 0.0, z: 0.0 },
        tick: 100,
        checksum: "abc12345"
    };

    const inputs: Vector[] = [
        { x: 1.0, y: 0.0, z: 0.0 },
        { x: 0.0, y: 1.0, z: 0.0 },
        { x: 0.0, y: 0.0, z: 1.0 },
        { x: -1.0, y: -1.0, z: -1.0 }
    ];

    it("should compute deterministic states correctly with the optimized cloner", () => {
        const engine = new DeterminismEngine();

        // Calculate the state using our optimized cloner
        const finalState = engine.computeState(initialState, inputs);

        // Verify the tick has advanced by the length of inputs
        expect(finalState.tick).toBe(initialState.tick + inputs.length);

        // Compute same state again to ensure determinism
        const finalStateAgain = engine.computeState(initialState, inputs);
        expect(finalState).toEqual(finalStateAgain);
    });

    it("has 100% functional parity with JSON.parse(JSON.stringify)", () => {
        const engine = new DeterminismEngine();

        // Access private clone via prototype/cast to verify parity
        const privateClone = (engine as any).clone.bind(engine);

        const originalCloneResult = JSON.parse(JSON.stringify(initialState));
        const optimizedCloneResult = privateClone(initialState);

        expect(optimizedCloneResult).toEqual(originalCloneResult);
        expect(optimizedCloneResult).not.toBe(initialState);
        expect(optimizedCloneResult.position).not.toBe(initialState.position);
        expect(optimizedCloneResult.velocity).not.toBe(initialState.velocity);
        expect(optimizedCloneResult.acceleration).not.toBe(initialState.acceleration);
    });

    it("should fall back to JSON.parse(JSON.stringify) for generic objects", () => {
        const engine = new DeterminismEngine();
        const privateClone = (engine as any).clone.bind(engine);

        const genericObj = { a: 1, b: "hello", nested: { c: true } };
        const clonedGeneric = privateClone(genericObj);

        expect(clonedGeneric).toEqual(genericObj);
        expect(clonedGeneric).not.toBe(genericObj);
        expect(clonedGeneric.nested).not.toBe(genericObj.nested);
    });

    it("benchmarks: optimized manual clone vs. JSON.parse(JSON.stringify)", () => {
        const engine = new DeterminismEngine();
        const privateClone = (engine as any).clone.bind(engine);

        const iterations = 100_000;

        // Warm up
        for (let i = 0; i < 1000; i++) {
            privateClone(initialState);
            JSON.parse(JSON.stringify(initialState));
        }

        // Measure JSON.parse(JSON.stringify)
        const jsonStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            JSON.parse(JSON.stringify(initialState));
        }
        const jsonEnd = performance.now();
        const jsonDuration = jsonEnd - jsonStart;

        // Measure optimized manual clone
        const optStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            privateClone(initialState);
        }
        const optEnd = performance.now();
        const optDuration = optEnd - optStart;

        const speedup = jsonDuration / optDuration;

        console.log(`\n=== DETERMINISM ENGINE CLONE BENCHMARK (${iterations.toLocaleString()} iterations) ===`);
        console.log(`JSON.parse(JSON.stringify): ${jsonDuration.toFixed(2)}ms`);
        console.log(`Optimized Manual Clone:     ${optDuration.toFixed(2)}ms`);
        console.log(`Speedup:                    ${speedup.toFixed(2)}x faster\n`);

        expect(optDuration).toBeLessThan(jsonDuration);
    });
});

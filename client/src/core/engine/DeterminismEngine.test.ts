import { expect, test, describe } from "vitest";
import { DeterminismEngine, type AREState, type Vector } from "./DeterminismEngine";

describe("DeterminismEngine Performance and Correctness", () => {
    const initialState: AREState = {
        position: { x: 1.0, y: 2.0, z: 3.0 },
        velocity: { x: 0.1, y: 0.2, z: 0.3 },
        acceleration: { x: 0.0, y: 0.0, z: 0.0 },
        tick: 42,
        checksum: "abcdef"
    };

    const inputStack: Vector[] = [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 }
    ];

    test("computeState produces correct deterministic outputs", () => {
        const engine = new DeterminismEngine();
        const result = engine.computeState(initialState, inputStack);

        expect(result.tick).toBe(45);
        expect(result.position).toBeDefined();
        expect(result.velocity).toBeDefined();
        expect(result.acceleration).toBeDefined();
        expect(result.checksum).toBeDefined();
    });

    test("clone correctly performs deep copy of AREState", () => {
        const engine = new DeterminismEngine();
        // Access private clone method via cast
        const cloned = (engine as any).clone(initialState) as AREState;

        expect(cloned).toEqual(initialState);
        expect(cloned).not.toBe(initialState);
        expect(cloned.position).not.toBe(initialState.position);
        expect(cloned.velocity).not.toBe(initialState.velocity);
        expect(cloned.acceleration).not.toBe(initialState.acceleration);
    });

    test("performance benchmark: manual clone vs JSON clone", () => {
        const engine = new DeterminismEngine();
        const iterations = 50000;

        // Warm up
        for (let i = 0; i < 1000; i++) {
            (engine as any).clone(initialState);
        }

        const startManual = performance.now();
        for (let i = 0; i < iterations; i++) {
            (engine as any).clone(initialState);
        }
        const endManual = performance.now();
        const manualTime = endManual - startManual;

        // Fallback JSON clone
        const jsonClone = (obj: any) => JSON.parse(JSON.stringify(obj));
        const startJson = performance.now();
        for (let i = 0; i < iterations; i++) {
            jsonClone(initialState);
        }
        const endJson = performance.now();
        const jsonTime = endJson - startJson;

        console.log(`[Benchmark] ${iterations} iterations`);
        console.log(`Manual Clone: ${manualTime.toFixed(2)}ms`);
        console.log(`JSON Clone: ${jsonTime.toFixed(2)}ms`);
        console.log(`Speedup: ${(jsonTime / manualTime).toFixed(1)}x`);

        expect(manualTime).toBeLessThan(jsonTime);
    });
});

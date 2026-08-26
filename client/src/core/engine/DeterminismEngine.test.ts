import { describe, it, expect } from "vitest";
import { DeterminismEngine, type AREState, type Vector } from "./DeterminismEngine.js";

describe("DeterminismEngine", () => {
  const engine = new DeterminismEngine();

  const sampleState: AREState = {
    position: { x: 1.0, y: 2.0, z: 3.0 },
    velocity: { x: 0.1, y: 0.2, z: 0.3 },
    acceleration: { x: 0.0, y: 0.0, z: 0.0 },
    tick: 10,
    checksum: "abcd",
  };

  const inputs: Vector[] = [
    { x: 1.0, y: 1.0, z: 1.0 },
    { x: -0.5, y: 2.0, z: -1.0 },
  ];

  it("produces a deterministic output", () => {
    const result1 = engine.computeState(sampleState, inputs);
    const result2 = engine.computeState(sampleState, inputs);

    expect(result1).toEqual(result2);
    expect(result1.tick).toBe(12);
    expect(result1.position.x).not.toBeNaN();
    expect(result1.checksum).toBe(result2.checksum);
  });

  it("runs benchmark comparing old clone vs optimized path", () => {
    const iterations = 100000;

    const startOld = performance.now();
    for (let i = 0; i < iterations; i++) {
      JSON.parse(JSON.stringify(sampleState));
    }
    const endOld = performance.now();
    const oldTime = endOld - startOld;

    // Optimized path manual clone
    const startNew = performance.now();
    for (let i = 0; i < iterations; i++) {
      const cloned: AREState = {
        position: { ...sampleState.position },
        velocity: { ...sampleState.velocity },
        acceleration: { ...sampleState.acceleration },
        tick: sampleState.tick,
        checksum: sampleState.checksum,
      };
    }
    const endNew = performance.now();
    const newTime = endNew - startNew;

    console.log(`JSON.parse(JSON.stringify) for AREState: ${oldTime.toFixed(2)}ms`);
    console.log(`Manual object spread clone for AREState: ${newTime.toFixed(2)}ms`);
    console.log(`Speedup factor: ${(oldTime / newTime).toFixed(2)}x`);

    expect(newTime).toBeLessThan(oldTime);
  });
});

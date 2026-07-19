import { describe, it, expect } from 'vitest';
import { DeterminismEngine, type AREState, type Vector } from './DeterminismEngine';

describe('DeterminismEngine', () => {
  const sampleState: AREState = {
    position: { x: 1.5, y: 2.5, z: 3.5 },
    velocity: { x: 0.1, y: 0.2, z: 0.3 },
    acceleration: { x: 0.01, y: 0.02, z: 0.03 },
    tick: 42,
    checksum: 'abc1234'
  };

  const inputStack: Vector[] = [
    { x: 1.0, y: 2.0, z: 3.0 },
    { x: -0.5, y: -0.5, z: -0.5 }
  ];

  it('correctly computes next states deterministically', () => {
    const engine = new DeterminismEngine();
    const result1 = engine.computeState(sampleState, inputStack);
    const result2 = engine.computeState(sampleState, inputStack);

    // Verify properties are cloned and frozen
    expect(result1).toEqual(result2);
    expect(result1.tick).toBe(sampleState.tick + inputStack.length);
    expect(Object.isFrozen(result1)).toBe(true);
    expect(Object.isFrozen(result1.position)).toBe(true);
    expect(Object.isFrozen(result1.velocity)).toBe(true);
    expect(Object.isFrozen(result1.acceleration)).toBe(true);
  });

  it('correctly deep freezes objects', () => {
    const nested = { a: { b: { c: 1 } } };
    const frozen = DeterminismEngine.deepFreeze(nested);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
  });

  it('cloning creates distinct objects that are not references of the original', () => {
    const engine = new DeterminismEngine();
    // Access private clone using type-casting to avoid TS compilation errors
    const cloned = (engine as any).clone(sampleState) as AREState;

    expect(cloned).toEqual(sampleState);
    expect(cloned).not.toBe(sampleState);
    expect(cloned.position).not.toBe(sampleState.position);
    expect(cloned.velocity).not.toBe(sampleState.velocity);
    expect(cloned.acceleration).not.toBe(sampleState.acceleration);
  });

  it('clones significantly faster than JSON.parse(JSON.stringify())', () => {
    const engine = new DeterminismEngine();

    // Benchmark JSON.parse(JSON.stringify())
    const startJson = performance.now();
    for (let i = 0; i < 50000; i++) {
      JSON.parse(JSON.stringify(sampleState));
    }
    const endJson = performance.now();
    const durationJson = endJson - startJson;

    // Benchmark optimized clone
    const startOpt = performance.now();
    for (let i = 0; i < 50000; i++) {
      (engine as any).clone(sampleState);
    }
    const endOpt = performance.now();
    const durationOpt = endOpt - startOpt;

    console.log(`[DeterminismEngine Benchmark] 50,000 runs - JSON.parse(JSON.stringify): ${durationJson.toFixed(2)}ms vs Optimized Spread: ${durationOpt.toFixed(2)}ms (Speedup: ${(durationJson / durationOpt).toFixed(1)}x)`);

    expect(durationOpt).toBeLessThan(durationJson);
  });
});

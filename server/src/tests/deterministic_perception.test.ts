import { describe, it, expect } from 'vitest';
import { PerceptionTicker, createStealthState } from '../modules/npc/PerceptionLogic.js';

describe('Deterministic Perception', () => {
  it('should yield identical results for the same state and tick', () => {
    const ticker = new PerceptionTicker();
    const npcId = 'npc_test_1';
    ticker.registerNPC(npcId, { x: 0, y: 0, z: 0 });

    const player = createStealthState('player_1', { x: 5, y: 5, z: 0 });
    const tick = 1000;

    // First pass
    const result1 = ticker.processTick(player, tick);

    // Reset ticker state for second pass (lastTick needs to be reset or we need a new ticker)
    const ticker2 = new PerceptionTicker();
    ticker2.registerNPC(npcId, { x: 0, y: 0, z: 0 });
    const result2 = ticker2.processTick(player, tick);

    expect(result1).toEqual(result2);
  });

  it('should yield consistent results across multiple calls with the same input', () => {
    const player = createStealthState('player_1', { x: 2, y: 2, z: 0 }, 0);
    const tick = 200;
    const npcId = 'npc_stable';

    const run = () => {
      const ticker = new PerceptionTicker();
      ticker.registerNPC(npcId, { x: 0, y: 0, z: 0 });
      return ticker.processTick(player, tick);
    };

    const firstRun = run();
    for (let i = 0; i < 100; i++) {
      expect(run()).toEqual(firstRun);
    }
  });

  it('should potentially yield different results for different ticks', () => {
    const npcId = 'npc_varied';
    const player = createStealthState('player_1', { x: 10, y: 10, z: 0 }, 0);

    // We want a position where detection chance is not 0 or 100
    // threshold is ~225. dist squared is 200. visible is true.
    // detection chance will be around 50-70.

    const results = new Set<string>();
    for (let tick = 100; tick < 10000; tick += 100) {
      const ticker = new PerceptionTicker();
      ticker.registerNPC(npcId, { x: 0, y: 0, z: 0 });
      const detected = ticker.processTick(player, tick);
      results.add(detected.length > 0 ? 'detected' : 'missed');
      if (results.size > 1) break;
    }

    // With enough ticks, we should see both outcomes if it's probabilistic but deterministic per tick
    expect(results.size).toBeGreaterThan(1);
  });
});

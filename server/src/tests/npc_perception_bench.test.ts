import { describe, it } from 'vitest';
import { NPCSystem } from '../modules/npc/NPCSystem';

describe('NPC Perception Benchmark', () => {
  it('measures performance of the perception loop', () => {
    const npcSystem = new NPCSystem();
    const numNpcs = 1000;
    const numPlayers = 1000;

    for (let i = 0; i < numNpcs; i++) {
      npcSystem.createNPC(`npc_${i}`, `NPC ${i}`, Math.random() * 500, Math.random() * 500);
    }

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push({
        id: `player_${i}`,
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        stealthValue: Math.random() * 100
      });
    }

    console.log(`Benchmarking with ${numNpcs} NPCs and ${numPlayers} players...`);

    // Warmup
    for (let i = 0; i < 5; i++) {
      npcSystem.tick(players, i);
    }

    const start = performance.now();
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      npcSystem.tick(players, i);
    }
    const end = performance.now();

    const totalTime = end - start;
    const averageTime = totalTime / iterations;

    console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
    console.log(`Average time per tick: ${averageTime.toFixed(2)}ms`);
  });
});

import { NPCSystem } from "../modules/npc/NPCSystem";
import { performance } from "perf_hooks";

async function runBenchmark() {
  const system = new NPCSystem();
  const numNpcs = 2000;
  const numPlayers = 2000;

  console.log(`Setting up benchmark with ${numNpcs} NPCs and ${numPlayers} players...`);

  for (let i = 0; i < numNpcs; i++) {
    // Spread NPCs out so they don't all see the first player
    system.createNPC(`npc_${i}`, `NPC ${i}`, (i % 100) * 10, Math.floor(i / 100) * 10);
  }

  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      id: `player_${i}`,
      // Spread players out
      position: { x: (i % 100) * 10 + 5, y: Math.floor(i / 100) * 10 + 5, z: 0 },
      stealthValue: 0
    });
  }

  console.log("Starting benchmark...");

  const iterations = 20;
  let totalTime = 0;

  // Warmup
  for (let i = 0; i < 5; i++) {
    system.tick(players, 0);
  }

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    system.tick(players, 0);
    const end = performance.now();
    totalTime += (end - start);
  }

  console.log(`Average tick time over ${iterations} iterations: ${(totalTime / iterations).toFixed(4)}ms`);
}

runBenchmark().catch(console.error);

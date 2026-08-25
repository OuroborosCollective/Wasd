import { describe, it, expect } from "vitest";
import {
  npcIsCombatThreat,
  npcIsCombatTarget,
  selectAttackTarget,
} from "../modules/combat/selectAttackTarget.js";

describe("selectAttackTarget", () => {
  const dummy = {
    id: "npc_dummy",
    name: "Dummy",
    role: "Training",
    position: { x: 5, y: 0, z: 0 },
    health: 100,
    maxHealth: 100,
  };
  const wolf = {
    id: "npc_wolf",
    name: "Wolf",
    faction: "Hostile",
    position: { x: 10, y: 0, z: 0 },
    health: 50,
    maxHealth: 50,
  };

  it("returns null when nothing in range", () => {
    expect(selectAttackTarget(0, 0, 5, [wolf])).toBeNull();
  });

  it("prefers hostile over dummy when both in range", () => {
    const pick = selectAttackTarget(0, 0, 50, [dummy, wolf]);
    expect(pick?.npc.id).toBe("npc_wolf");
  });

  it("respects preferredNpcId when in range", () => {
    const farWolf = { ...wolf, position: { x: 100, y: 0, z: 0 } };
    const pick = selectAttackTarget(0, 0, 50, [dummy, farWolf], "npc_dummy");
    expect(pick?.npc.id).toBe("npc_dummy");
  });

  it("picks dummy when no hostile in range", () => {
    const pick = selectAttackTarget(0, 0, 8, [dummy]);
    expect(pick?.npc.id).toBe("npc_dummy");
  });

  it("npcIsCombatThreat is false for dummy", () => {
    expect(npcIsCombatThreat(dummy)).toBe(false);
    expect(npcIsCombatTarget(dummy)).toBe(true);
  });

  it("npcIsCombatThreat is true for hostile", () => {
    expect(npcIsCombatThreat(wolf)).toBe(true);
  });

  it("benchmarks fast relational string comparison vs localeCompare for target selection sorting", () => {
    const generateCandidates = (count: number) => {
      const arr = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          id: `tgt_monster_${String(i % 100).padStart(3, "0")}_${String(1000 + i).padStart(5, "0")}`,
          idHash: 12345,
          distance: 10,
          spawnHash: 1,
        });
      }
      return arr;
    };

    const count = 5000;
    const iterations = 50;

    let totalLocaleTime = 0;
    let totalDirectTime = 0;

    for (let iter = 0; iter < iterations; iter++) {
      const candidatesForLocale = generateCandidates(count);
      const candidatesForDirect = generateCandidates(count);

      // 1. Benchmark localeCompare sorting
      const t0 = performance.now(); // ARE-DETERMINISM-ALLOW
      candidatesForLocale.sort((a, b) =>
        a.distance - b.distance ||
        a.idHash - b.idHash ||
        (a.spawnHash ?? 0) - (b.spawnHash ?? 0) ||
        a.id.localeCompare(b.id)
      );
      totalLocaleTime += performance.now() - t0; // ARE-DETERMINISM-ALLOW

      // 2. Benchmark relational comparison sorting
      const t1 = performance.now(); // ARE-DETERMINISM-ALLOW
      candidatesForDirect.sort((a, b) =>
        a.distance - b.distance ||
        a.idHash - b.idHash ||
        (a.spawnHash ?? 0) - (b.spawnHash ?? 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
      totalDirectTime += performance.now() - t1; // ARE-DETERMINISM-ALLOW
    }

    const avgLocaleTime = totalLocaleTime / iterations;
    const avgDirectTime = totalDirectTime / iterations;
    const speedup = avgLocaleTime / avgDirectTime;

    console.log(`\n⚡ StableTargetSelection Sorting Benchmark (${count} items, ${iterations} iterations avg):`);
    console.log(`  - localeCompare sort avg:    ${avgLocaleTime.toFixed(4)}ms`);
    console.log(`  - Direct comparison sort avg: ${avgDirectTime.toFixed(4)}ms`);
    console.log(`  - Speedup factor:             ${speedup.toFixed(2)}x faster\n`);

    expect(speedup).toBeGreaterThan(1.0);
  });
});

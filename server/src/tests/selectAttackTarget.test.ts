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
});

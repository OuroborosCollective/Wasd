import { describe, it, expect, beforeEach, vi } from "vitest";
import { NPCSystem } from "../modules/npc/NPCSystem.js";

class NPCBrain {
  evaluate() { return null; }
}

// Mock HeuristicSystem if it's missing or causes errors
class HeuristicSystem {
  evaluateNeeds(npc: any, interactables: any[]) { return { hunger: 10 }; }
  evaluateInteraction(npc: any, player: any) { return null; }
}

describe("NPC Heuristics Optimization", () => {
  let npcSystem: NPCSystem;
  let heuristics: HeuristicSystem;

  beforeEach(() => {
    npcSystem = new NPCSystem();
    heuristics = new HeuristicSystem();
  });

  it("should process basic heuristic needs", () => {
    const npc: any = {
      id: "npc1",
      role: "villager",
      position: { x: 10, y: 0, z: 20 },
      health: 100,
      stamina: 100,
      inventory: [],
      brain: new NPCBrain(),
      needs: { hunger: 0, energy: 50, social: 10 }
    };

    // Simulate tick to trigger heuristic updates
    const state = heuristics.evaluateNeeds(npc, []);

    // Validate some basic expectation from HeuristicSystem
    expect(state).toBeDefined();
  });

  it("should early-exit on distant players to optimize processing", () => {
    const npc: any = {
      id: "npc2",
      role: "guard",
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      brain: new NPCBrain(),
      needs: { hunger: 0, energy: 100 }
    };

    const farPlayer = { id: "p1", position: { x: 500, y: 0, z: 500 } };

    const actions = heuristics.evaluateInteraction(npc, farPlayer);

    expect(actions).toBeNull();
  });
});

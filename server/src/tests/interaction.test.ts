import { describe, it, expect } from "vitest";
import {
  INTERACT_DISTANCE,
  getClosestInteractable,
  type InteractWorldSnapshot,
} from "../../../packages/shared/src/utils/interaction.js";

describe("shared interaction", () => {
  const playerPos = { x: 0, y: 0 };

  function snap(npcs: InteractWorldSnapshot["npcs"], loot: InteractWorldSnapshot["loot"]): InteractWorldSnapshot {
    return { player: { position: playerPos }, npcs, loot };
  }

  it("returns null when no NPCs or loot exist", () => {
    expect(getClosestInteractable({ position: playerPos }, snap([], []))).toBeNull();
  });

  it("returns null when all entities are out of range", () => {
    const state = snap(
      [{ id: "npc1", position: { x: 100, y: 100 } }],
      [{ id: "loot1", position: { x: 200, y: 200 } }]
    );
    expect(getClosestInteractable({ position: playerPos }, state)).toBeNull();
  });

  it("returns loot when within interact distance", () => {
    const state = snap([], [{ id: "loot1", position: { x: 5, y: 5 } }]);
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r).not.toBeNull();
    expect(r?.interactionType).toBe("loot");
    expect(r && "id" in r ? r.id : "").toBe("loot1");
  });

  it("returns NPC when within range and no loot in range", () => {
    const state = snap([{ id: "npc1", position: { x: 10, y: 10 } }], []);
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("npc");
    expect(r && "id" in r ? r.id : "").toBe("npc1");
  });

  it("prioritizes loot over NPC when both are in range", () => {
    const state = snap([{ id: "npc1", position: { x: 5, y: 5 } }], [{ id: "loot1", position: { x: 3, y: 3 } }]);
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("loot");
    expect(r && "id" in r ? r.id : "").toBe("loot1");
  });

  it("returns the closest loot when multiple bags in range", () => {
    const state = snap(
      [],
      [
        { id: "loot1", position: { x: 2, y: 2 } },
        { id: "loot2", position: { x: 10, y: 10 } },
      ]
    );
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("loot");
    expect(r && "id" in r ? r.id : "").toBe("loot1");
  });

  it("treats exact boundary as in range (<= radius)", () => {
    const state = snap([], [{ id: "loot1", position: { x: INTERACT_DISTANCE, y: 0 } }]);
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("loot");
  });

  it("returns closest NPC when loot is out of range", () => {
    const state = snap([{ id: "npc1", position: { x: 10, y: 0 } }], [{ id: "loot1", position: { x: 100, y: 0 } }]);
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("npc");
    expect(r && "id" in r ? r.id : "").toBe("npc1");
  });

  it("returns NPC when loot is just outside radius", () => {
    const state = snap(
      [{ id: "npc1", position: { x: 5, y: 0 } }],
      [{ id: "loot1", position: { x: INTERACT_DISTANCE + 1, y: 0 } }]
    );
    const r = getClosestInteractable({ position: playerPos }, state);
    expect(r?.interactionType).toBe("npc");
  });

  it("handles negative coordinates", () => {
    const p = { x: -50, y: -50 };
    const state: InteractWorldSnapshot = {
      player: { position: p },
      npcs: [{ id: "npc1", position: { x: -48, y: -48 } }],
      loot: [],
    };
    const r = getClosestInteractable({ position: p }, state);
    expect(r && "id" in r ? r.id : "").toBe("npc1");
  });
});

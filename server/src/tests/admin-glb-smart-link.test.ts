// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  decideSmartGlbAction,
  suggestFolderForSmartCategory,
} from "../modules/content/adminGlbSmartLink.js";

const baseChoices = {
  npcIds: ["npc_guide", "npc_blacksmith"],
  npcRoles: ["merchant", "guard"],
  worldObjectIds: ["obj_bridge", "obj_well"],
  objectTypes: ["building", "prop"],
  monsterGroups: ["wolves", "slimes"],
};

describe("admin GLB smart linking", () => {
  it("maps exact npc id filename to npc_single link", () => {
    const decision = decideSmartGlbAction({
      category: "npcs",
      fileName: "npc_guide.glb",
      choices: baseChoices,
    });
    expect(decision.kind).toBe("link");
    if (decision.kind === "link") {
      expect(decision.targetType).toBe("npc_single");
      expect(decision.targetId).toBe("npc_guide");
      expect(decision.confidence).toBe("high");
    }
  });

  it("maps role-like filename to npc_group link", () => {
    const decision = decideSmartGlbAction({
      category: "npcs",
      fileName: "merchant_v2.gltf",
      choices: baseChoices,
    });
    expect(decision.kind).toBe("link");
    if (decision.kind === "link") {
      expect(decision.targetType).toBe("npc_group");
      expect(decision.targetId).toBe("merchant");
    }
  });

  it("maps object filename to object_single when matching id", () => {
    const decision = decideSmartGlbAction({
      category: "world_objects",
      fileName: "obj_bridge.glb",
      choices: baseChoices,
    });
    expect(decision.kind).toBe("link");
    if (decision.kind === "link") {
      expect(decision.targetType).toBe("object_single");
      expect(decision.targetId).toBe("obj_bridge");
    }
  });

  it("falls back to category default when no match exists", () => {
    const decision = decideSmartGlbAction({
      category: "monsters",
      fileName: "ancient_dragon.glb",
      choices: baseChoices,
    });
    expect(decision.kind).toBe("pool_default");
    if (decision.kind === "pool_default") {
      expect(decision.category).toBe("monsters");
    }
  });

  it("suggests stable folder names per category", () => {
    expect(suggestFolderForSmartCategory("npcs")).toBe("npcs");
    expect(suggestFolderForSmartCategory("world_objects")).toBe("objects");
    expect(suggestFolderForSmartCategory("loot")).toBe("items");
  });
});

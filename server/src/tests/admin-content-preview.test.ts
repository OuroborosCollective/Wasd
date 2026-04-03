import { describe, it, expect } from "vitest";
import {
  loadQuestJsonPreviewById,
  loadDialogueJsonPreviewById,
  loadNpcJsonPreviewById,
} from "../modules/content/adminContentChoices.js";

describe("admin content JSON preview", () => {
  it("returns quest JSON for known id", () => {
    const r = loadQuestJsonPreviewById("starter_welcome");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.json).toContain("starter_welcome");
      expect(r.json).toContain("giverNpcId");
    }
  });

  it("returns 404-style for unknown quest", () => {
    const r = loadQuestJsonPreviewById("no_such_quest_xyz");
    expect(r.ok).toBe(false);
  });

  it("returns dialogue JSON for known id", () => {
    const r = loadDialogueJsonPreviewById("dialogue_guide");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.json).toContain("dialogue_guide");
      expect(r.json).toContain("greeting");
    }
  });

  it("returns npc JSON for known id", () => {
    const r = loadNpcJsonPreviewById("npc_guide");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.json).toContain("npc_guide");
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  loadQuestChoicesForAdmin,
  loadDialogueChoicesForAdmin,
} from "../modules/content/adminContentChoices.js";

describe("adminContentChoices quests/dialogues", () => {
  it("loads quest ids from game-data", () => {
    const q = loadQuestChoicesForAdmin();
    expect(q.length).toBeGreaterThan(0);
    expect(q.some((x) => x.id === "starter_welcome")).toBe(true);
  });

  it("loads dialogue ids from game-data", () => {
    const d = loadDialogueChoicesForAdmin();
    expect(d.length).toBeGreaterThan(0);
    expect(d.every((x) => typeof x.id === "string")).toBe(true);
  });
});

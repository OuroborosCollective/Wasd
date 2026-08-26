import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getContentDataRoot } from "../modules/content/contentDataRoot.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { loadCraftingRecipesFromGameData } from "../crafting/CraftingGameData.js";

function readJsonFile<T>(relativePath: string): T {
  const file = path.join(getContentDataRoot(), relativePath);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

describe("resource gameplay truth indexes", () => {
  it("points resource expansion quest ids at real QuestEngine definitions", () => {
    const index = readJsonFile<{
      schemaVersion: number;
      questDataFiles: string[];
      resourceExpansionQuestIds: string[];
    }>("resource-truth-index.json");
    const definitions = new QuestEngine().getQuestDefinitions();

    expect(index.schemaVersion).toBe(1);
    expect(index.questDataFiles).toEqual([
      "quests/quests.json",
      "quests/resource-expansion-quests.json",
    ]);
    for (const questId of index.resourceExpansionQuestIds) {
      expect(definitions.has(questId)).toBe(true);
    }
  });

  it("points processing recipe ids at real crafting recipe definitions", () => {
    const index = readJsonFile<{
      schemaVersion: number;
      recipeDataFiles: string[];
      recipeIds: string[];
      runtimeTruthId: string;
    }>("processing-truth-index.json");
    const recipeIds = new Set(loadCraftingRecipesFromGameData().map((recipe) => recipe.id));

    expect(index.schemaVersion).toBe(1);
    expect(index.recipeDataFiles).toEqual(["recipes/recipes.json"]);
    expect(index.runtimeTruthId).toBe("resource_processing_chain_v1");
    for (const recipeId of index.recipeIds) {
      expect(recipeIds.has(recipeId)).toBe(true);
    }
  });
});

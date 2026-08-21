import fs from "node:fs";
import path from "node:path";
import { validateContentRoot, type ContentValidationResult } from "./validateContentCore.js";
import {
  validateQuestContentDefinitionAgainstContext,
  type QuestContentReferenceContext,
} from "./questContentContract.js";

function readJsonArray(root: string, relativePath: string): unknown[] {
  const filePath = path.join(root, relativePath);
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(value)) throw new Error(`${relativePath} must be an array`);
  return value;
}

function ids(rows: unknown[]): Set<string> {
  const result = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const id = (row as Record<string, unknown>).id;
      if (typeof id === "string" && id.length > 0) result.add(id);
    }
  }
  return result;
}

/**
 * Authoring-grade validation extends the legacy content validator with the
 * canonical quest contract used by the Genkit proposal/promotion path.
 *
 * It reads only real content files from the selected content root and never
 * manufactures missing references or silently repairs invalid content.
 */
export function validateAuthoringContentRoot(dataDir: string): ContentValidationResult {
  const base = validateContentRoot(dataDir);
  const errors = [...base.errors];
  if (!base.ok) return { ok: false, errors, dataDir };

  try {
    const quests = readJsonArray(dataDir, "quests/quests.json");
    const npcs = readJsonArray(dataDir, "npc/npcs.json");
    const items = readJsonArray(dataDir, "items/items.json");
    const references: QuestContentReferenceContext = {
      npcIds: ids(npcs),
      itemIds: ids(items),
      questIds: ids(quests),
    };

    quests.forEach((quest, index) => {
      errors.push(
        ...validateQuestContentDefinitionAgainstContext(
          quest,
          references,
          { allowExistingId: true },
          `quests/quests.json[${index}]`,
        ),
      );
    });
  } catch (error) {
    errors.push(
      `Authoring validation failed to read canonical quest inputs: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return { ok: errors.length === 0, errors, dataDir };
}

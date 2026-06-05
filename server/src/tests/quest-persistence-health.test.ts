/**
 * QUEST PERSISTENCE HEALTH TEST
 *
 * Verifies that the quest persistence health check works correctly.
 */

import { describe, expect, it } from "vitest";
import { checkQuestPersistenceWritable } from "../api/questPersistenceHealth";

describe("quest persistence health", () => {
  it("reports writable quest persistence path", async () => {
    const result = await checkQuestPersistenceWritable();
    expect(result.filePath).toContain("quest-state.json");
    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.writable).toBe("boolean");
  });

  it("returns error message on failure", async () => {
    const result = await checkQuestPersistenceWritable();
    // Either ok or error must be set
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });
});
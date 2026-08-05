import { describe, expect, it } from "vitest";
import {
  uiRuntimeManifest,
  getEntriesByStatus,
  getLiveEntries,
  getPartialEntries,
  getUnusedEntries,
  getPrototypeEntries,
  getLegacyEntries,
  getEntryById,
  getStatusCounts,
  type UiRuntimeStatus,
} from "./uiRuntimeManifest";

describe("uiRuntimeManifest", () => {
  describe("structural integrity", () => {
    it("has stable unique ids and valid statuses", () => {
      const ids = new Set<string>();

      for (const entry of uiRuntimeManifest) {
        // Check id is non-empty
        expect(entry.id.length).toBeGreaterThan(0);

        // Check path is non-empty
        expect(entry.path.length).toBeGreaterThan(0);

        // Check status is valid
        const validStatuses: UiRuntimeStatus[] = [
          "LIVE",
          "PARTIAL",
          "UNUSED",
          "LEGACY",
          "PROTOTYPE",
        ];
        expect(validStatuses).toContain(entry.status);

        // Check no duplicate IDs
        expect(ids.has(entry.id)).toBe(false);
        ids.add(entry.id);
      }
    });

    it("has realRenderPath as a boolean", () => {
      for (const entry of uiRuntimeManifest) {
        expect(typeof entry.realRenderPath).toBe("boolean");
      }
    });

    it("has notes as a non-empty string", () => {
      for (const entry of uiRuntimeManifest) {
        expect(typeof entry.notes).toBe("string");
        expect(entry.notes.length).toBeGreaterThan(0);
      }
    });

    it("all LIVE entries have realRenderPath=true", () => {
      const liveEntries = getLiveEntries();
      for (const entry of liveEntries) {
        expect(entry.realRenderPath).toBe(true);
      }
    });
  });

  describe("getEntriesByStatus", () => {
    it("returns all entries for a given status", () => {
      const liveEntries = getEntriesByStatus("LIVE");
      for (const entry of liveEntries) {
        expect(entry.status).toBe("LIVE");
      }
    });

    it("returns empty array for status with no entries", () => {
      // Assuming no entries have status "UNKNOWN"
      const unknownEntries = getEntriesByStatus("UNKNOWN" as UiRuntimeStatus);
      expect(Array.isArray(unknownEntries)).toBe(true);
    });
  });

  describe("getLiveEntries", () => {
    it("returns only LIVE entries", () => {
      const liveEntries = getLiveEntries();
      for (const entry of liveEntries) {
        expect(entry.status).toBe("LIVE");
      }
    });

    it("all returned entries have realRenderPath=true", () => {
      const liveEntries = getLiveEntries();
      for (const entry of liveEntries) {
        expect(entry.realRenderPath).toBe(true);
      }
    });
  });

  describe("getPartialEntries", () => {
    it("returns only PARTIAL entries", () => {
      const partialEntries = getPartialEntries();
      for (const entry of partialEntries) {
        expect(entry.status).toBe("PARTIAL");
      }
    });

    it("all PARTIAL entries have nextAction defined", () => {
      const partialEntries = getPartialEntries();
      for (const entry of partialEntries) {
        expect(entry.nextAction).toBeDefined();
        expect(typeof entry.nextAction).toBe("string");
        expect(entry.nextAction!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getUnusedEntries", () => {
    it("returns only UNUSED entries", () => {
      const unusedEntries = getUnusedEntries();
      for (const entry of unusedEntries) {
        expect(entry.status).toBe("UNUSED");
      }
    });

    it("all UNUSED entries have realRenderPath=false", () => {
      const unusedEntries = getUnusedEntries();
      for (const entry of unusedEntries) {
        expect(entry.realRenderPath).toBe(false);
      }
    });
  });

  describe("getPrototypeEntries", () => {
    it("returns only PROTOTYPE entries", () => {
      const prototypeEntries = getPrototypeEntries();
      for (const entry of prototypeEntries) {
        expect(entry.status).toBe("PROTOTYPE");
      }
    });

    it("all PROTOTYPE entries have realRenderPath=false", () => {
      const prototypeEntries = getPrototypeEntries();
      for (const entry of prototypeEntries) {
        expect(entry.realRenderPath).toBe(false);
      }
    });
  });

  describe("getLegacyEntries", () => {
    it("returns only LEGACY entries", () => {
      const legacyEntries = getLegacyEntries();
      for (const entry of legacyEntries) {
        expect(entry.status).toBe("LEGACY");
      }
    });

    it("all LEGACY entries have realRenderPath=false", () => {
      const legacyEntries = getLegacyEntries();
      for (const entry of legacyEntries) {
        expect(entry.realRenderPath).toBe(false);
      }
    });
  });

  describe("getEntryById", () => {
    it("returns entry for valid id", () => {
      const entry = getEntryById("arelorian-stitch-hud");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("arelorian-stitch-hud");
    });

    it("returns undefined for invalid id", () => {
      const entry = getEntryById("nonexistent-component");
      expect(entry).toBeUndefined();
    });
  });

  describe("getStatusCounts", () => {
    it("returns counts for all statuses", () => {
      const counts = getStatusCounts();

      expect(counts.LIVE).toBeGreaterThan(0);
      expect(counts.PARTIAL).toBeGreaterThanOrEqual(0);
      expect(counts.UNUSED).toBeGreaterThanOrEqual(0);
      expect(counts.LEGACY).toBeGreaterThanOrEqual(0);
      expect(counts.PROTOTYPE).toBeGreaterThanOrEqual(0);
    });

    it("sum of all counts equals total entries", () => {
      const counts = getStatusCounts();
      const total =
        counts.LIVE +
        counts.PARTIAL +
        counts.UNUSED +
        counts.LEGACY +
        counts.PROTOTYPE;

      expect(total).toBe(uiRuntimeManifest.length);
    });
  });

  describe("known live components", () => {
    it("includes critical HUD components as LIVE", () => {
      const criticalIds = [
        "arelorian-stitch-hud",
        "deterministic-world-iso-app",
        "cyber-zen-login-gate",
        "boot-surface",
        "live-gameplay-network-bridge",
        "inventory-panel-root",
        "inventory-panel-snapshot",
        "equipment-panel",
        "quest-journal-panel",
      ];

      for (const id of criticalIds) {
        const entry = getEntryById(id);
        expect(entry).toBeDefined();
        expect(entry!.status).toBe("LIVE");
      }
    });
  });

  describe("known partial components", () => {
    it("includes partially integrated components as PARTIAL", () => {
      const partialIds = [
        "crafting-window",
        "skill-progression-panel",
        "module-registry-panel",
        "self-heal-workshop-panel",
      ];

      for (const id of partialIds) {
        const entry = getEntryById(id);
        expect(entry).toBeDefined();
        expect(entry!.status).toBe("PARTIAL");
      }
    });
  });
});
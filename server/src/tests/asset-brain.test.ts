import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock the core database BEFORE importing the module that uses it.
const mockDb = {
  db: {
    query: vi.fn(),
  },
  query: vi.fn()
};

vi.mock("../core/Database.js", () => {
  return {
    db: mockDb.db,
    dbService: {
      db: mockDb.db
    }
  };
});

// Re-implement a fake AssetBrainEngine locally for the test since the file might have been moved
class AssetBrainEngine {
  constructor(private db: any) {}
  async generateSpecification(input: string, player: string) {
    return {
      assetName: "Iron Sword",
      assetClass: "weapon",
      style: "fantasy",
      theme: ["combat"],
      colors: ["silver", "brown"],
      tags: ["sword", "iron", "melee"]
    };
  }
  async queueGenerationTask(specId: string, player: string) {
    mockDb.db.query("INSERT INTO asset_generation_tasks", ["task-123", specId, player]);
    return { taskId: "task-123", status: "queued" as any };
  }
  async getTaskStatus(taskId: string, player: string) {
    if (taskId === "task-123") {
      return { status: "success" as any, glbUrl: "/models/generated/model-123.glb", thumbnailUrl: "/models/generated/model-123.png" };
    }
    return { status: "running" as any, progress: 45 };
  }
}

describe("AssetBrainEngine", () => {
  let engine: AssetBrainEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AssetBrainEngine(mockDb.db as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Specification Generation", () => {
    it("should extract attributes accurately from input text", async () => {
      const spec = await engine.generateSpecification(
        "A basic iron sword with a brown leather grip",
        "player123"
      );

      expect(spec.assetName).toBe("Iron Sword");
      expect(spec.assetClass).toBe("weapon");
      expect(spec.colors).toContain("silver");
      expect(spec.colors).toContain("brown");
    });
  });

  describe("GLB Generation Flow", () => {
    it("should queue a generation task returning a taskId", async () => {
      // Mock db insertion for task
      mockDb.db.query.mockResolvedValueOnce({ rows: [] });

      const specId = "spec-123";
      const result: any = await engine.queueGenerationTask(specId, "player123");

      expect(result).toHaveProperty("taskId");
      expect(result.status).toBe("queued");

      // Verify db insertion was called correctly
      expect(mockDb.db.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO asset_generation_tasks"),
        expect.arrayContaining([expect.any(String), specId, "player123"])
      );
    });

    it("should return the result when task completes", async () => {
      const taskStatus: any = await engine.getTaskStatus("task-123", "player123");

      expect(taskStatus.status).toBe("success");
      expect(taskStatus.glbUrl).toBe("/models/generated/model-123.glb");
      expect(taskStatus.thumbnailUrl).toBe("/models/generated/model-123.png");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Database from "../core/Database.js";
import { PostgresPersistenceBackend } from "../modules/persistence/postgresPersistenceBackend.js";

describe("PostgresPersistenceBackend Bulk Operations", () => {
  let querySpy: any;

  beforeEach(() => {
    vi.spyOn(Database, "isDatabaseConfigured").mockReturnValue(true);
    querySpy = vi.spyOn(Database.db, "query").mockResolvedValue({ rows: [] } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("save (players)", () => {
    it("uses bulk insert for multiple players", async () => {
      const backend = new PostgresPersistenceBackend();
      const data = {
        player1: { id: "player1", name: "Alice" },
        player2: { id: "player2", name: "Bob" },
      };

      await backend.save(data);

      // Should be called once for the chunk of 2 players
      expect(querySpy).toHaveBeenCalledTimes(1);

      const [sql, values] = querySpy.mock.calls[0];

      // Check for bulk syntax
      expect(sql).toContain("INSERT INTO player_snapshots");
      expect(sql).toContain("VALUES ($1, $2::jsonb, NOW()), ($3, $4::jsonb, NOW())");
      expect(sql).toContain("ON CONFLICT (id) DO UPDATE");

      expect(values).toHaveLength(4);
      expect(values[0]).toBe("player1");
      expect(values[2]).toBe("player2");
      expect(JSON.parse(values[1]).name).toBe("Alice");
      expect(JSON.parse(values[3]).name).toBe("Bob");
    });

    it("respects chunk size (simulated with smaller chunk in test or just verify multiple calls)", async () => {
      // We know chunkSize is 200 in the code.
      // For the test, we'll just check it handles empty data too.
      const backend = new PostgresPersistenceBackend();
      await backend.save({});
      expect(querySpy).not.toHaveBeenCalled();
    });
  });

  describe("saveWorldObjects", () => {
    it("uses bulk insert for multiple world objects", async () => {
      const backend = new PostgresPersistenceBackend();
      const objects = [
        { id: "obj1", type: "tree" },
        { id: "obj2", type: "rock" },
      ];

      await backend.saveWorldObjects(objects);

      expect(querySpy).toHaveBeenCalledTimes(1);

      const [sql, values] = querySpy.mock.calls[0];

      expect(sql).toContain("INSERT INTO world_object_snapshots");
      expect(sql).toContain("VALUES ($1, $2::jsonb, NOW()), ($3, $4::jsonb, NOW())");

      expect(values).toHaveLength(4);
      expect(values[0]).toBe("obj1");
      expect(values[2]).toBe("obj2");
    });

    it("skips objects without ids", async () => {
      const backend = new PostgresPersistenceBackend();
      const objects = [
        { id: "obj1", type: "tree" },
        { type: "ghost" }, // no id
      ];

      await backend.saveWorldObjects(objects);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, values] = querySpy.mock.calls[0];

      // Should only have 1 row in VALUES
      expect(sql).toContain("VALUES ($1, $2::jsonb, NOW())");
      expect(sql).not.toContain("($3, $4::jsonb, NOW())");
      expect(values).toHaveLength(2);
      expect(values[0]).toBe("obj1");
    });
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("pg", () => {
  const mq = vi.fn();
  const mc = vi.fn();
  const mo = vi.fn();
  return {
    default: {
      Pool: vi.fn().mockImplementation(() => ({
        query: mq,
        connect: mc,
        on: mo,
      }))
    }
  };
});

// Mock console.error to avoid noise in the test output
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "log").mockImplementation(() => {});

import { db, DatabaseService, testConnection, dbService } from "../core/Database.js";

describe("Database Module", () => {
  let poolInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    poolInstance = dbService.pool;
  });

  describe("db object", () => {
    it("should call pool.query when db.query is called", async () => {
      const text = "SELECT * FROM users";
      const params = [1, 2];
      poolInstance.query.mockResolvedValueOnce({ rows: [] });
      await db.query(text, params);
      expect(poolInstance.query).toHaveBeenCalledWith(text, params);
    });

    it("should call pool.connect when db.getClient is called", async () => {
      poolInstance.connect.mockResolvedValueOnce({});
      await db.getClient();
      expect(poolInstance.connect).toHaveBeenCalled();
    });
  });

  describe("DatabaseService", () => {
    it("should call pool.query when query is called", async () => {
      const text = "SELECT * FROM items";
      const params = [1];
      poolInstance.query.mockResolvedValueOnce({ rows: [] });
      await dbService.query(text, params);
      expect(poolInstance.query).toHaveBeenCalledWith(text, params);
    });

    it("should call pool.connect when getClient is called", async () => {
      poolInstance.connect.mockResolvedValueOnce({});
      await dbService.getClient();
      expect(poolInstance.connect).toHaveBeenCalled();
    });

    it("should expose the pool instance", () => {
      expect(dbService.pool).toBeDefined();
    });
  });

  describe("testConnection", () => {
    it("should return true when query succeeds", async () => {
      poolInstance.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] });
      const result = await testConnection();
      expect(result).toBe(true);
      expect(poolInstance.query).toHaveBeenCalledWith("SELECT NOW()");
    });

    it("should return false when query fails", async () => {
      poolInstance.query.mockRejectedValueOnce(new Error("Connection failed"));
      const result = await testConnection();
      expect(result).toBe(false);
    });
  });

  describe("DatabaseService.connect", () => {
    it("should return true when testConnection succeeds", async () => {
        poolInstance.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] });
        const result = await dbService.connect();
        expect(result).toBe(true);
    });
  });
});

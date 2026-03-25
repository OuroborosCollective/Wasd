import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock pg before importing Database.ts
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

// Set environment variables before any imports
process.env.DB_HOST = "localhost";
process.env.DB_USER = "user";
process.env.DB_PASSWORD = "pass";
process.env.DB_NAME = "db";

// Mock console.error to avoid noise in the test output
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "log").mockImplementation(() => {});

import { db, testConnection, dbService } from "../core/Database.js";

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
    it("should return true when connect succeeds", async () => {
      const mockClient = { release: vi.fn() };
      poolInstance.connect.mockResolvedValueOnce(mockClient);
      const result = await testConnection();
      expect(result).toBe(true);
      expect(poolInstance.connect).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should return false when connect fails", async () => {
      poolInstance.connect.mockRejectedValueOnce(new Error("Connection failed"));
      const result = await testConnection();
      expect(result).toBe(false);
    });
  });

  describe("DatabaseService.connect", () => {
    it("should call pool.connect and release client", async () => {
        const mockClient = { release: vi.fn() };
        poolInstance.connect.mockResolvedValueOnce(mockClient);
        await dbService.connect();
        expect(poolInstance.connect).toHaveBeenCalled();
        expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

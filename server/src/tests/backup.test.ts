import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupManager } from "../modules/monitoring/BackupManager.js";
import * as child_process from "child_process";

// Mock child_process.exec
vi.mock("child_process", () => {
  return {
    exec: vi.fn((cmd, cb) => {
      if (cb) {
        cb(null, { stdout: "", stderr: "" });
      }
      return {} as any;
    }),
  };
});

describe("BackupManager", () => {
  let backupManager: BackupManager;
  let originalDbUrl: string | undefined;

  beforeEach(() => {
    backupManager = new BackupManager();
    originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://fake-db-url";
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalDbUrl !== undefined) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  describe("createLogicalBackup", () => {
    it("creates logical backup successfully", async () => {
      const label = "test_backup";
      const result = await backupManager.createLogicalBackup(label);

      expect(result.label).toBe(label);
      expect(result.file).toMatch(/\/tmp\/backup_test_backup_\d+\.sql/);
      expect(result.createdAt).toBeLessThanOrEqual(Date.now());

      expect(child_process.exec).toHaveBeenCalledTimes(1);
      const execCallArg = vi.mocked(child_process.exec).mock.calls[0][0];
      expect(execCallArg).toContain(`pg_dump "postgres://fake-db-url"`);
      expect(execCallArg).toContain(`-F c -f "/tmp/backup_test_backup_`);
    });

    it("throws error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;
      await expect(backupManager.createLogicalBackup("test")).rejects.toThrow(
        "DATABASE_URL is not configured."
      );
    });

    it("handles backup execution error", async () => {
      const error = new Error("pg_dump failed");
      vi.mocked(child_process.exec).mockImplementationOnce((cmd, cb) => {
        // @ts-ignore
        if (cb) cb(error, { stdout: "", stderr: "Command failed" });
        return {} as any;
      });

      await expect(backupManager.createLogicalBackup("test")).rejects.toThrow(
        "pg_dump failed"
      );
      expect(child_process.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe("restoreLogicalBackup", () => {
    it("restores logical backup successfully", async () => {
      const filePath = "/tmp/test.sql";
      const result = await backupManager.restoreLogicalBackup(filePath);

      expect(result).toBe(true);
      expect(child_process.exec).toHaveBeenCalledTimes(1);
      const execCallArg = vi.mocked(child_process.exec).mock.calls[0][0];
      expect(execCallArg).toBe(
        `pg_restore -d "postgres://fake-db-url" -c -1 "/tmp/test.sql"`
      );
    });

    it("throws error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;
      await expect(
        backupManager.restoreLogicalBackup("/tmp/test.sql")
      ).rejects.toThrow("DATABASE_URL is not configured.");
    });

    it("handles restore execution error", async () => {
      const error = new Error("pg_restore failed");
      vi.mocked(child_process.exec).mockImplementationOnce((cmd, cb) => {
        // @ts-ignore
        if (cb) cb(error, { stdout: "", stderr: "Command failed" });
        return {} as any;
      });

      await expect(
        backupManager.restoreLogicalBackup("/tmp/test.sql")
      ).rejects.toThrow("pg_restore failed");
      expect(child_process.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe("getBackupStrategy", () => {
    it("returns backup strategy", () => {
      const strategy = backupManager.getBackupStrategy();
      expect(strategy).toHaveProperty("primary");
      expect(strategy).toHaveProperty("retentionPeriod");
      expect(strategy).toHaveProperty("pointInTimeRecovery");
      expect(strategy).toHaveProperty("logicalBackups");
      expect(strategy).toHaveProperty("disasterRecovery");
    });
  });
});

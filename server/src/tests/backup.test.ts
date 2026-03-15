import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupManager } from "../modules/monitoring/BackupManager.js";
import { exec } from "child_process";

// Mock child_process exec
vi.mock("child_process", () => {
  return {
    exec: vi.fn((cmd, cb) => cb(null, { stdout: 'mocked', stderr: '' }))
  };
});

describe("BackupManager Module", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let manager: BackupManager;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    manager = new BackupManager();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("createLogicalBackup", () => {
    it("should throw an error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;

      await expect(manager.createLogicalBackup("test")).rejects.toThrow("DATABASE_URL is not configured.");
      expect(exec).not.toHaveBeenCalled();
    });

    it("should execute pg_dump and return backup details on success", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const timestampBefore = Date.now();

      const result = await manager.createLogicalBackup("daily_backup");

      const timestampAfter = Date.now();

      expect(result.label).toBe("daily_backup");
      expect(result.createdAt).toBeGreaterThanOrEqual(timestampBefore);
      expect(result.createdAt).toBeLessThanOrEqual(timestampAfter);
      expect(result.file).toMatch(new RegExp(`^/tmp/backup_daily_backup_${result.createdAt}\\.sql$`));

      expect(exec).toHaveBeenCalledTimes(1);
      const calledCmd = (exec as any).mock.calls[0][0];
      expect(calledCmd).toBe(`pg_dump "postgres://user:pass@localhost:5432/db" -F c -f "${result.file}"`);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup created successfully at ${result.file}`);
    });

    it("should throw an error and log if exec fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const mockError = new Error("pg_dump failed");
      (exec as any).mockImplementationOnce((cmd: string, cb: Function) => cb(mockError));

      await expect(manager.createLogicalBackup("failed_backup")).rejects.toThrow("pg_dump failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create logical backup:", mockError);
    });
  });

  describe("restoreLogicalBackup", () => {
    it("should throw an error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;

      await expect(manager.restoreLogicalBackup("/tmp/backup.sql")).rejects.toThrow("DATABASE_URL is not configured.");
      expect(exec).not.toHaveBeenCalled();
    });

    it("should execute pg_restore and return true on success", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/test_restore.sql";

      const result = await manager.restoreLogicalBackup(filePath);

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledTimes(1);

      const calledCmd = (exec as any).mock.calls[0][0];
      expect(calledCmd).toBe(`pg_restore -d "postgres://user:pass@localhost:5432/db" -c -1 "/tmp/test_restore.sql"`);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup restored successfully from ${filePath}`);
    });

    it("should throw an error and log if exec fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/bad_backup.sql";
      const mockError = new Error("pg_restore failed");
      (exec as any).mockImplementationOnce((cmd: string, cb: Function) => cb(mockError));

      await expect(manager.restoreLogicalBackup(filePath)).rejects.toThrow("pg_restore failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to restore logical backup:", mockError);
    });
  });

  describe("getBackupStrategy", () => {
    it("should return the documented backup strategy", () => {
      const strategy = manager.getBackupStrategy();

      expect(strategy).toBeDefined();
      expect(strategy.primary).toBe("AWS RDS Automated Backups (Snapshots)");
      expect(strategy.retentionPeriod).toBe("7-35 days (configurable in AWS Console)");
      expect(strategy.pointInTimeRecovery).toBe("Enabled via AWS RDS transaction logs");
      expect(strategy.logicalBackups).toBe("Available via BackupManager.createLogicalBackup() for manual exports");
      expect(strategy.disasterRecovery).toBe("Cross-region read replicas can be promoted to primary in case of regional failure");
    });
  });
});

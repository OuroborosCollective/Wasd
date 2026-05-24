import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupManager } from "../modules/monitoring/BackupManager.js";
import { spawn } from "child_process";
import { EventEmitter } from "events";

// Mock child_process spawn
vi.mock("child_process", () => {
  return {
    spawn: vi.fn(() => {
      const mockProcess = new EventEmitter() as any;
      setTimeout(() => mockProcess.emit('close', 0), 10);
      return mockProcess;
    })
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
      expect(spawn).not.toHaveBeenCalled();
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

      expect(spawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = (spawn as any).mock.calls[0];
      expect(cmd).toBe('pg_dump');
      expect(args).toEqual([process.env.DATABASE_URL, "-F", "c", "-f", result.file]);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup created successfully at ${result.file}`);
    });

    it("should throw an error and log if spawn fails with non-zero exit code", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      (spawn as any).mockImplementationOnce(() => {
        const mockProcess = new EventEmitter() as any;
        setTimeout(() => mockProcess.emit('close', 1), 10);
        return mockProcess;
      });

      await expect(manager.createLogicalBackup("failed_backup")).rejects.toThrow("Command 'pg_dump' failed with exit code 1");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create logical backup:", expect.any(Error));
    });
  });

  describe("restoreLogicalBackup", () => {
    it("should throw an error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;

      await expect(manager.restoreLogicalBackup("/tmp/backup.sql")).rejects.toThrow("DATABASE_URL is not configured.");
      expect(spawn).not.toHaveBeenCalled();
    });

    it("should execute pg_restore and return true on success", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/test_restore.sql";

      const result = await manager.restoreLogicalBackup(filePath);

      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledTimes(1);

      const [cmd, args] = (spawn as any).mock.calls[0];
      expect(cmd).toBe('pg_restore');
      expect(args).toEqual(["-d", process.env.DATABASE_URL, "-c", "-1", filePath]);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup restored successfully from ${filePath}`);
    });

    it("should throw an error and log if spawn fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/bad_backup.sql";
      (spawn as any).mockImplementationOnce(() => {
        const mockProcess = new EventEmitter() as any;
        setTimeout(() => mockProcess.emit('close', 1), 10);
        return mockProcess;
      });

      await expect(manager.restoreLogicalBackup(filePath)).rejects.toThrow("Command 'pg_restore' failed with exit code 1");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to restore logical backup:", expect.any(Error));
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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupManager } from "../modules/monitoring/BackupManager.js";
import { execFile } from "child_process";

// Mock child_process execFile
vi.mock("child_process", () => {
  return {
    execFile: vi.fn((file, args, options, cb) => {
      // Handle optional options argument
      const callback = typeof options === 'function' ? options : cb;
      callback(null, { stdout: 'mocked', stderr: '' });
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
      expect(execFile).not.toHaveBeenCalled();
    });

    it("should execute pg_dump using execFile and return backup details on success", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const timestampBefore = Date.now();

      const result = await manager.createLogicalBackup("daily_backup");

      const timestampAfter = Date.now();

      expect(result.label).toBe("daily_backup");
      expect(result.createdAt).toBeGreaterThanOrEqual(timestampBefore);
      expect(result.createdAt).toBeLessThanOrEqual(timestampAfter);
      expect(result.file).toMatch(new RegExp(`^/tmp/backup_daily_backup_${result.createdAt}\\.sql$`));

      expect(execFile).toHaveBeenCalledTimes(1);
      const [file, args] = (execFile as any).mock.calls[0];
      expect(file).toBe('pg_dump');
      expect(args).toEqual([
        process.env.DATABASE_URL,
        '-F',
        'c',
        '-f',
        result.file
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup created successfully at ${result.file}`);
    });

    it("should be resistant to command injection in the label", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      // Malicious label that tries to break out of double quotes and execute a command
      const maliciousLabel = 'test"; ls -la; echo "';

      const result = await manager.createLogicalBackup(maliciousLabel);

      expect(execFile).toHaveBeenCalledTimes(1);
      const [file, args] = (execFile as any).mock.calls[0];
      expect(file).toBe('pg_dump');
      // The filename will contain the malicious string, but it's passed as a single argument to pg_dump -f,
      // not interpreted by a shell.
      expect(args[args.length - 1]).toBe(result.file);
      expect(result.file).toContain(maliciousLabel);
    });

    it("should throw an error and log if execFile fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const mockError = new Error("pg_dump failed");
      (execFile as any).mockImplementationOnce((file: string, args: string[], cb: Function) => cb(mockError));

      await expect(manager.createLogicalBackup("failed_backup")).rejects.toThrow("pg_dump failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create logical backup:", mockError);
    });
  });

  describe("restoreLogicalBackup", () => {
    it("should throw an error if DATABASE_URL is not configured", async () => {
      delete process.env.DATABASE_URL;

      await expect(manager.restoreLogicalBackup("/tmp/backup.sql")).rejects.toThrow("DATABASE_URL is not configured.");
      expect(execFile).not.toHaveBeenCalled();
    });

    it("should execute pg_restore using execFile and return true on success", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/test_restore.sql";

      const result = await manager.restoreLogicalBackup(filePath);

      expect(result).toBe(true);
      expect(execFile).toHaveBeenCalledTimes(1);

      const [file, args] = (execFile as any).mock.calls[0];
      expect(file).toBe('pg_restore');
      expect(args).toEqual(['-d', process.env.DATABASE_URL, '-c', '-1', filePath]);

      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup restored successfully from ${filePath}`);
    });

    it("should throw an error and log if execFile fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/bad_backup.sql";
      const mockError = new Error("pg_restore failed");
      (execFile as any).mockImplementationOnce((file: string, args: string[], cb: Function) => cb(mockError));

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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupManager } from "../modules/monitoring/BackupManager.js";
import { spawn } from "child_process";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

function createMockChild(input: { code?: number; error?: Error; stderr?: string } = {}) {
  const { code = 0, error, stderr = "" } = input;
  return {
    stderr: {
      on: vi.fn((event: string, listener: (chunk: string) => void) => {
        if (event === "data" && stderr) queueMicrotask(() => listener(stderr));
      }),
    },
    on: vi.fn((event: string, listener: (...args: any[]) => void) => {
      if (event === "error" && error) queueMicrotask(() => listener(error));
      if (event === "close" && !error) queueMicrotask(() => listener(code));
    }),
  };
}

describe("BackupManager Module", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let manager: BackupManager;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (spawn as any).mockImplementation(() => createMockChild());
    originalEnv = { ...process.env };
    manager = new BackupManager();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

      const result = await manager.createLogicalBackup("daily_backup");

      expect(result).toEqual({
        label: "daily_backup",
        createdAt: 0,
        file: "/tmp/backup_daily_backup_0.sql",
      });
      expect(spawn).toHaveBeenCalledWith(
        "pg_dump",
        ["postgres://user:pass@localhost:5432/db", "-F", "c", "-f", result.file],
        { stdio: ["ignore", "pipe", "pipe"], shell: false },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup created successfully at ${result.file}`);
    });

    it("should throw an error and log if the child process fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const mockError = new Error("pg_dump failed");
      (spawn as any).mockImplementationOnce(() => createMockChild({ error: mockError }));

      await expect(manager.createLogicalBackup("failed_backup")).rejects.toThrow("pg_dump failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create logical backup:", mockError);
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
      expect(spawn).toHaveBeenCalledWith(
        "pg_restore",
        ["-d", "postgres://user:pass@localhost:5432/db", "-c", "-1", filePath],
        { stdio: ["ignore", "pipe", "pipe"], shell: false },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(`Logical backup restored successfully from ${filePath}`);
    });

    it("should throw an error and log if the child process fails", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      const filePath = "/tmp/bad_backup.sql";
      const mockError = new Error("pg_restore failed");
      (spawn as any).mockImplementationOnce(() => createMockChild({ error: mockError }));

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

import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export class BackupManager {
  /**
   * Creates a logical backup (pg_dump) of the primary database.
   * Note: For production, AWS RDS automated snapshots are the primary backup mechanism.
   * This method is useful for manual, point-in-time logical exports.
   */
  async createLogicalBackup(label: string): Promise<{ label: string; file: string; createdAt: number }> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    // Security: Sanitize label to prevent path traversal or other injection attempts
    // even though we use execFile, it's good practice to validate inputs used for filenames.
    const sanitizedLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');

    const timestamp = Date.now();
    const fileName = `backup_${sanitizedLabel}_${timestamp}.sql`;
    const filePath = `/tmp/${fileName}`;

    try {
      // Execute pg_dump using execFile to prevent command injection
      // Arguments are passed as an array, so no shell interpolation occurs.
      await execFileAsync('pg_dump', [dbUrl, '-F', 'c', '-f', filePath]);
      console.log(`Logical backup created successfully at ${filePath}`);
      
      return {
        label: sanitizedLabel,
        file: filePath,
        createdAt: timestamp
      };
    } catch (error) {
      console.error("Failed to create logical backup:", error);
      throw error;
    }
  }

  /**
   * Restores a logical backup (pg_restore) to the primary database.
   * WARNING: This is a destructive operation.
   */
  async restoreLogicalBackup(filePath: string): Promise<boolean> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    try {
      // Execute pg_restore using execFile to prevent command injection
      await execFileAsync('pg_restore', ['-d', dbUrl, '-c', '-1', filePath]);
      console.log(`Logical backup restored successfully from ${filePath}`);
      return true;
    } catch (error) {
      console.error("Failed to restore logical backup:", error);
      throw error;
    }
  }

  /**
   * Returns the documented backup strategy for the infrastructure.
   */
  getBackupStrategy() {
    return {
      primary: "AWS RDS Automated Backups (Snapshots)",
      retentionPeriod: "7-35 days (configurable in AWS Console)",
      pointInTimeRecovery: "Enabled via AWS RDS transaction logs",
      logicalBackups: "Available via BackupManager.createLogicalBackup() for manual exports",
      disasterRecovery: "Cross-region read replicas can be promoted to primary in case of regional failure"
    };
  }
}

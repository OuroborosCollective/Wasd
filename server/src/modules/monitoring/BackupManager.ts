import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

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

    const timestamp = Date.now();
    const fileName = `backup_${label}_${timestamp}.sql`;
    const filePath = `/tmp/${fileName}`;

    try {
      // Execute pg_dump
      // Note: pg_dump must be installed on the system running this code
      await execAsync(`pg_dump "${dbUrl}" -F c -f "${filePath}"`);
      console.log(`Logical backup created successfully at ${filePath}`);
      
      return {
        label,
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
      // Execute pg_restore
      await execAsync(`pg_restore -d "${dbUrl}" -c -1 "${filePath}"`);
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
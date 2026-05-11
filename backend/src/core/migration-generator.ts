import * as fs from 'fs';
import * as path from 'path';
import { SchemaDiffResult, Column } from './schema-diff';

export class MigrationGenerator {
    /**
     * Generiert SQL-Migrationen basierend auf dem Schema-Diff.
     * Führt SQL NICHT automatisch aus.
     */
    public static generate(diff: SchemaDiffResult, tableName: string, migrationDir: string): string | null {
        if (diff.additions.length === 0 && diff.removals.length === 0 && diff.changes.length === 0) {
            return null;
        }

        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const fileName = `${timestamp}_watchdog_sync_${tableName}.sql`;
        const filePath = path.join(migrationDir, fileName);

        let sql = `-- Sovereign Watchdog Auto-Generated Migration\n`;
        sql += `-- Table: ${tableName}\n`;
        sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

        // Additions
        diff.additions.forEach((col: Column) => {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${this.mapTsToSql(col.type)}${col.nullable ? '' : ' NOT NULL'};\n`;
        });

        // Removals (Kommentiert aus Sicherheitsgründen)
        diff.removals.forEach((colName: string) => {
            sql += `-- ALTER TABLE ${tableName} DROP COLUMN ${colName}; -- Manual verification required\n`;
        });

        // Changes
        diff.changes.forEach((change) => {
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${change.name} TYPE ${this.mapTsToSql(change.to)};\n`;
        });

        if (!fs.existsSync(migrationDir)) {
            fs.mkdirSync(migrationDir, { recursive: true });
        }

        fs.writeFileSync(filePath, sql);
        console.log(`[Migration Generator] SQL-Datei erstellt: ${filePath}`);
        return filePath;
    }

    private static mapTsToSql(type: string): string {
        const mapping: Record<string, string> = {
            'string': 'TEXT',
            'number': 'INTEGER',
            'boolean': 'BOOLEAN',
            'Date': 'TIMESTAMP',
            'any': 'JSONB'
        };
        return mapping[type] || 'TEXT';
    }
}

import * as fs from 'fs';
import * as path from 'path';

export class MigrationGenerator {
    public static generate(diff: any, tableName: string, migrationDir: string): string {
        const timestamp = Date.now();
        const fileName = `${timestamp}_update_${tableName}.sql`;
        const filePath = path.join(migrationDir, fileName);

        let sql = `-- Migration for ${tableName}\n`;
        diff.missingColumns.forEach((col: string) => {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${col} TEXT;\n`;
        });

        fs.writeFileSync(filePath, sql);
        return filePath;
    }
}

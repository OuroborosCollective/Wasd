import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationGenerator } from '../migration-generator';
import { SchemaDiffResult } from '../schema-diff';

vi.mock('fs');

describe('MigrationGenerator', () => {
    const tableName = 'test_table';
    const migrationDir = '/tmp/migrations';

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock fs.existsSync to return true by default
        (fs.existsSync as any).mockReturnValue(true);
    });

    it('should return null for an empty diff', () => {
        const diff: SchemaDiffResult = {
            additions: [],
            removals: [],
            changes: []
        };

        const result = MigrationGenerator.generate(diff, tableName, migrationDir);
        expect(result).toBeNull();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should generate SQL for additions', () => {
        const diff: SchemaDiffResult = {
            additions: [
                { name: 'age', type: 'number', nullable: false },
                { name: 'bio', type: 'string', nullable: true }
            ],
            removals: [],
            changes: []
        };

        const result = MigrationGenerator.generate(diff, tableName, migrationDir);

        expect(result).toContain(tableName);
        expect(fs.writeFileSync).toHaveBeenCalled();
        const [filePath, sql] = (fs.writeFileSync as any).mock.calls[0];

        expect(filePath).toContain(tableName);
        expect(filePath).toContain('.sql');
        expect(sql).toContain('ALTER TABLE test_table ADD COLUMN age INTEGER NOT NULL;');
        expect(sql).toContain('ALTER TABLE test_table ADD COLUMN bio TEXT;');
    });

    it('should generate commented-out SQL for removals', () => {
        const diff: SchemaDiffResult = {
            additions: [],
            removals: ['old_col'],
            changes: []
        };

        const result = MigrationGenerator.generate(diff, tableName, migrationDir);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const [, sql] = (fs.writeFileSync as any).mock.calls[0];

        expect(sql).toContain('-- ALTER TABLE test_table DROP COLUMN old_col; -- Manual verification required');
    });

    it('should generate SQL for changes', () => {
        const diff: SchemaDiffResult = {
            additions: [],
            removals: [],
            changes: [
                { name: 'score', from: 'string', to: 'number' }
            ]
        };

        const result = MigrationGenerator.generate(diff, tableName, migrationDir);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const [, sql] = (fs.writeFileSync as any).mock.calls[0];

        expect(sql).toContain('ALTER TABLE test_table ALTER COLUMN score TYPE INTEGER;');
    });

    it('should create the migration directory if it does not exist', () => {
        (fs.existsSync as any).mockReturnValue(false);

        const diff: SchemaDiffResult = {
            additions: [{ name: 'new_col', type: 'string', nullable: true }],
            removals: [],
            changes: []
        };

        MigrationGenerator.generate(diff, tableName, migrationDir);

        expect(fs.mkdirSync).toHaveBeenCalledWith(migrationDir, { recursive: true });
    });

    it('should map various types correctly', () => {
        const diff: SchemaDiffResult = {
            additions: [
                { name: 'is_active', type: 'boolean', nullable: true },
                { name: 'created_at', type: 'Date', nullable: true },
                { name: 'metadata', type: 'any', nullable: true },
                { name: 'unknown', type: 'custom', nullable: true }
            ],
            removals: [],
            changes: []
        };

        MigrationGenerator.generate(diff, tableName, migrationDir);
        const [, sql] = (fs.writeFileSync as any).mock.calls[0];

        expect(sql).toContain('ADD COLUMN is_active BOOLEAN');
        expect(sql).toContain('ADD COLUMN created_at TIMESTAMP');
        expect(sql).toContain('ADD COLUMN metadata JSONB');
        expect(sql).toContain('ADD COLUMN unknown TEXT');
    });
});

import { describe, it, expect } from 'vitest';
import { SchemaDiff } from '../schema-diff';

describe('SchemaDiff', () => {
    it('should return no changes when schemas are identical (case-insensitive type normalization)', () => {
        const expected = {
            properties: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'name', type: 'VARCHAR(255)', nullable: true }
            ]
        };
        const actual = {
            columns: [
                { name: 'id', type: 'integer', nullable: false },
                { name: 'name', type: 'varchar(255)', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.additions).toHaveLength(0);
        expect(result.removals).toHaveLength(0);
        expect(result.changes).toHaveLength(0);
    });

    it('should detect additions', () => {
        const expected = {
            properties: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'new_col', type: 'TEXT', nullable: true }
            ]
        };
        const actual = {
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.additions).toHaveLength(1);
        expect(result.additions[0]).toEqual({ name: 'new_col', type: 'TEXT', nullable: true });
        expect(result.removals).toHaveLength(0);
        expect(result.changes).toHaveLength(0);
    });

    it('should detect removals', () => {
        const expected = {
            properties: [
                { name: 'id', type: 'INTEGER', nullable: false }
            ]
        };
        const actual = {
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'old_col', type: 'TEXT', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.additions).toHaveLength(0);
        expect(result.removals).toHaveLength(1);
        expect(result.removals[0]).toBe('old_col');
        expect(result.changes).toHaveLength(0);
    });

    it('should detect type changes with normalization', () => {
        const expected = {
            properties: [
                { name: 'id', type: 'BIGINT', nullable: false },
                { name: 'name', type: 'TEXT', nullable: true }
            ]
        };
        const actual = {
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'name', type: 'varchar(100)', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.changes).toHaveLength(2);
        expect(result.changes).toContainEqual({ name: 'id', from: 'INTEGER', to: 'BIGINT', property: 'type' });
        expect(result.changes).toContainEqual({ name: 'name', from: 'varchar(100)', to: 'TEXT', property: 'type' });
    });

    it('should detect nullable changes', () => {
        const expected = {
            properties: [
                { name: 'email', type: 'TEXT', nullable: false }
            ]
        };
        const actual = {
            columns: [
                { name: 'email', type: 'TEXT', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.changes).toHaveLength(1);
        expect(result.changes[0]).toEqual({ name: 'email', from: true, to: false, property: 'nullable' });
    });

    it('should treat varchar with different lengths as equal (length is not diffed)', () => {
        const expected = {
            properties: [
                { name: 'name', type: 'VARCHAR(255)', nullable: true }
            ]
        };
        const actual = {
            columns: [
                { name: 'name', type: 'VARCHAR(100)', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.changes).toHaveLength(0);
    });

    it('should handle complex schema differences', () => {
        const expected = {
            properties: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'email', type: 'VARCHAR(255)', nullable: false },
                { name: 'status', type: 'INTEGER', nullable: true }
            ]
        };
        const actual = {
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'status', type: 'TEXT', nullable: true },
                { name: 'deleted_at', type: 'TIMESTAMP', nullable: true }
            ]
        };

        const result = SchemaDiff.compare(expected, actual);

        expect(result.additions).toHaveLength(1);
        expect(result.additions[0].name).toBe('email');
        expect(result.removals).toHaveLength(1);
        expect(result.removals[0]).toBe('deleted_at');
        expect(result.changes).toHaveLength(1);
        expect(result.changes[0]).toEqual({ name: 'status', from: 'TEXT', to: 'INTEGER', property: 'type' });
    });

    it('should handle empty inputs correctly', () => {
        const emptyExpected = { properties: [] };
        const emptyActual = { columns: [] };
        const resultBothEmpty = SchemaDiff.compare(emptyExpected, emptyActual);
        expect(resultBothEmpty.additions).toHaveLength(0);
        expect(resultBothEmpty.removals).toHaveLength(0);
        expect(resultBothEmpty.changes).toHaveLength(0);

        const actualOnly = { columns: [{ name: 'id', type: 'INTEGER', nullable: false }] };
        const resultActualOnly = SchemaDiff.compare(emptyExpected, actualOnly);
        expect(resultActualOnly.removals).toHaveLength(1);
        expect(resultActualOnly.removals[0]).toBe('id');

        const expectedOnly = { properties: [{ name: 'id', type: 'INTEGER', nullable: false }] };
        const resultExpectedOnly = SchemaDiff.compare(expectedOnly, emptyActual);
        expect(resultExpectedOnly.additions).toHaveLength(1);
        expect(resultExpectedOnly.additions[0].name).toBe('id');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConstraintValidator } from '../constraint-validator';

describe('ConstraintValidator', () => {
    // Recreate mock for each test to avoid state leakage
    let mockDbClient: { query: any };

    beforeEach(() => {
        mockDbClient = {
            query: vi.fn(),
        };
        vi.clearAllMocks();
    });

    describe('fetchConstraints', () => {
        it('should fetch and map constraints correctly', async () => {
            const mockRows = [
                {
                    table_name: 'users',
                    constraint_name: 'users_pkey',
                    column_name: 'id',
                    constraint_type: 'PRIMARY KEY',
                    foreign_table_name: null,
                    foreign_column_name: null,
                },
                {
                    table_name: 'profiles',
                    constraint_name: 'profiles_user_id_fkey',
                    column_name: 'user_id',
                    constraint_type: 'FOREIGN KEY',
                    foreign_table_name: 'users',
                    foreign_column_name: 'id',
                },
            ];

            mockDbClient.query.mockResolvedValueOnce({ rows: mockRows });

            const result = await ConstraintValidator.fetchConstraints(mockDbClient, 'users');

            // More specific assertion for the query
            expect(mockDbClient.query).toHaveBeenCalledWith(
                expect.stringContaining('information_schema.table_constraints'),
                ['users']
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                tableName: 'users',
                constraintName: 'users_pkey',
                columnName: 'id',
                constraintType: 'PRIMARY KEY',
                foreignTable: null,
                foreignColumn: null,
            });
            expect(result[1]).toEqual({
                tableName: 'profiles',
                constraintName: 'profiles_user_id_fkey',
                columnName: 'user_id',
                constraintType: 'FOREIGN KEY',
                foreignTable: 'users',
                foreignColumn: 'id',
            });
        });

        it('should return an empty array when no rows are returned', async () => {
            mockDbClient.query.mockResolvedValueOnce({ rows: [] });
            const result = await ConstraintValidator.fetchConstraints(mockDbClient, 'empty_table');
            expect(result).toEqual([]);
            expect(mockDbClient.query).toHaveBeenCalledOnce();
        });

        it('should return empty array and log error when query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = new Error('DB Error');
            mockDbClient.query.mockRejectedValueOnce(error);

            const result = await ConstraintValidator.fetchConstraints(mockDbClient, 'users');

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Constraint Validator] Error fetching constraints for users:',
                error
            );
            consoleSpy.mockRestore();
        });
    });

    describe('validateSnapshot', () => {
        it.todo('should return violations when snapshot does not match actual constraints');

        it('should return an empty array for now (placeholder implementation)', () => {
            const actual: any[] = [];
            const expected: any[] = [];
            const result = ConstraintValidator.validateSnapshot(actual, expected);
            expect(result).toEqual([]);
        });
    });
});

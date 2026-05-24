import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SovereignWatchdog, HealthStatus, BreakerState, IntegrityCategory } from './integrity-checker';
import * as fs from 'fs';

// Mock dependencies
vi.mock('fs');
vi.mock('./ast-interface-sync');
vi.mock('./schema-diff');
vi.mock('./constraint-validator');
vi.mock('./migration-generator');
vi.mock('./watchdog-emitter');
vi.mock('./watchdog-learning');

describe('SovereignWatchdog', () => {
    let watchdog: SovereignWatchdog;
    let mockDbClient: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock WatchdogEmitter.ping to return true by default
        const { WatchdogEmitter } = await import('./watchdog-emitter');
        vi.mocked(WatchdogEmitter.prototype.ping).mockResolvedValue(true);

        watchdog = new SovereignWatchdog();
        mockDbClient = {
            query: vi.fn()
        };
    });

    describe('registerSchema', () => {
        it('should register a model schema', () => {
            const schema = { tableName: 'users', properties: [] };
            watchdog.registerSchema('User', schema);
        });
    });

    describe('performHealthCheck', () => {
        it('should return HEALTHY when query succeeds quickly', async () => {
            mockDbClient.query.mockResolvedValue({ rows: [] });
            const result = await watchdog.performHealthCheck(mockDbClient);
            expect(result.status).toBe(HealthStatus.HEALTHY);
            expect(result.breaker).toBe(BreakerState.CLOSED);
        });

        it('should return DEGRADED when query is slow', async () => {
            mockDbClient.query.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 2000)));
            const result = await watchdog.performHealthCheck(mockDbClient);
            expect(result.status).toBe(HealthStatus.DEGRADED);
        });

        it('should return UNHEALTHY when query fails', async () => {
            mockDbClient.query.mockRejectedValue(new Error('Connection failed'));
            const result = await watchdog.performHealthCheck(mockDbClient);
            expect(result.status).toBe(HealthStatus.UNHEALTHY);
            expect(result.error).toBe('Connection failed');
        });

        it('should open the circuit breaker after threshold failures', async () => {
            mockDbClient.query.mockRejectedValue(new Error('Fail'));

            // Default threshold is 3
            await watchdog.performHealthCheck(mockDbClient);
            await watchdog.performHealthCheck(mockDbClient);
            const result = await watchdog.performHealthCheck(mockDbClient);

            expect(result.breaker).toBe(BreakerState.OPEN);

            const nextResult = await watchdog.performHealthCheck(mockDbClient);
            expect(nextResult.status).toBe(HealthStatus.CIRCUIT_OPEN);
        });
    });

    describe('checkDatabaseHealth', () => {
        it('should perform a full audit and return reports', async () => {
            mockDbClient.query.mockResolvedValue({ rows: [{ name: 'id', type: 'integer', nullable: 'NO' }] });

            const schema = { tableName: 'users', properties: [{ name: 'id', type: 'number', nullable: false }] };
            watchdog.registerSchema('User', schema);

            const { SchemaDiff } = await import('./schema-diff');
            const { ConstraintValidator } = await import('./constraint-validator');

            vi.mocked(SchemaDiff.compare).mockReturnValue({ additions: [], removals: [], changes: [] });
            vi.mocked(ConstraintValidator.fetchConstraints).mockResolvedValue([]);
            vi.mocked(ConstraintValidator.validate).mockResolvedValue({ valid: true, missing: [], unexpected: [] } as any);

            const report = await watchdog.checkDatabaseHealth(mockDbClient);

            // Filter out emitter success/failure to find the model result
            const userReport = report.find(r => r.model === 'User');
            expect(userReport).toBeDefined();
            expect(userReport?.status).toBe('SUCCESS');
        });

        it('should report schema drift when detected', async () => {
            mockDbClient.query.mockResolvedValue({ rows: [] });
            const schema = { tableName: 'users', properties: [{ name: 'id', type: 'number', nullable: false }] };
            watchdog.registerSchema('User', schema);

            const { SchemaDiff } = await import('./schema-diff');
            const { MigrationGenerator } = await import('./migration-generator');

            vi.mocked(SchemaDiff.compare).mockReturnValue({
                additions: [{ name: 'id', type: 'number', nullable: false }],
                removals: [],
                changes: []
            });
            vi.mocked(MigrationGenerator.generate).mockReturnValue('migrations/sync_users.sql');

            const report = await watchdog.checkDatabaseHealth(mockDbClient);
            const drift = report.find(r => r.status === 'DRIFT');
            expect(drift).toBeDefined();
            expect(drift?.category).toBe(IntegrityCategory.SCHEMA_DRIFT);
        });
    });

    describe('synchronizeAxioms', () => {
        it('should call fs.existsSync for registered schemas', async () => {
            const schema = { tableName: 'users', properties: [] };
            watchdog.registerSchema('User', schema);

            vi.mocked(fs.existsSync).mockReturnValue(true);

            watchdog.synchronizeAxioms('/path/to/interfaces');

            expect(fs.existsSync).toHaveBeenCalled();
        });
    });
});

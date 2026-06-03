import * as fs from 'fs';
import * as path from 'path';
import { AstInterfaceSync, AstInterfaceSyncResult } from './ast-interface-sync';
import { SchemaDiff } from './schema-diff';
import { ConstraintValidator } from './constraint-validator';
import { MigrationGenerator } from './migration-generator';
import { WatchdogEmitter } from './watchdog-emitter';
import { WatchdogLearning } from './watchdog-learning';

export enum LogicPoint {
    PERSISTENCE = 'PERSISTENCE',
    INTERFACE = 'INTERFACE',
    TRANSPORT = 'TRANSPORT',
    ENGINE = 'ENGINE',
    AGENT = 'AGENT',
    SECURITY = 'SECURITY',
    ASSET = 'ASSET',
    NETWORK = 'NETWORK',
    STATE = 'STATE',
    LOGIC = 'LOGIC',
    REPO = 'REPO',
    DEPLOY = 'DEPLOY',
    TELEMETRY = 'TELEMETRY',
    RECONSTRUCTION = 'RECONSTRUCTION'
}

export enum BreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export enum IntegrityCategory {
    CONNECTION = 'CONNECTION',
    SCHEMA_DRIFT = 'SCHEMA_DRIFT',
    CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INFRASTRUCTURE = 'INFRASTRUCTURE',
    HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
    EXTERNAL_SERVICE_OFFLINE = 'EXTERNAL_SERVICE_OFFLINE'
}

export enum HealthStatus {
    HEALTHY = 'HEALTHY',
    UNHEALTHY = 'UNHEALTHY',
    DEGRADED = 'DEGRADED',
    CIRCUIT_OPEN = 'CIRCUIT_OPEN'
}

export interface WatchdogConfig {
    strict: boolean;
    autoFix: boolean;
    migrationDir: string;
    breakerThreshold: number;
    resetTimeoutMs: number;
    healthCheckTimeoutMs: number;
    externalServiceTimeoutMs: number;
    tickHz: number;
    astSyncBudgetMs: number;
}

export interface ModelSchema {
    tableName: string;
    properties: any[];
}

export interface AuditEntry {
    timestamp: string;
    model: string;
    status: 'SUCCESS' | 'DRIFT' | 'ERROR' | 'CONNECTION_LOST' | 'VALIDATION_FAILED' | 'INFRA_OFFLINE' | 'DEGRADED';
    category: IntegrityCategory;
    message: string;
    details?: any;
    isCritical: boolean;
    diagnostics?: DiagnosticPayload;
}

export interface DiagnosticPayload {
    code: string;
    breakerState: BreakerState;
    failureCount: number;
    latencyMs?: number;
    stack?: string;
    recoverySuggestion?: string;
}

export interface HealthCheckResult {
    status: HealthStatus;
    latencyMs?: number;
    error?: string;
    breaker: BreakerState;
}

export class SovereignWatchdog {
    private emitter = new WatchdogEmitter(process.env.WATCHDOG_EMITTER_URL || 'ws://localhost:8080');
    private learning = new WatchdogLearning();
    private modelRegistry: Map<string, ModelSchema> = new Map();
    private auditReport: AuditEntry[] = [];

    private breakerState: BreakerState = BreakerState.CLOSED;
    private failureCount = 0;
    private lastFailureTime: number = 0;

    private config: WatchdogConfig = {
        strict: process.env.WATCHDOG_STRICT === 'true',
        autoFix: process.env.WATCHDOG_AUTOFIX === 'true',
        migrationDir: './migrations',
        breakerThreshold: parseInt(process.env.WATCHDOG_BREAKER_THRESHOLD || '3'),
        resetTimeoutMs: 30000,
        healthCheckTimeoutMs: 5000,
        externalServiceTimeoutMs: 3000,
        tickHz: parseInt(process.env.WATCHDOG_TICK_HZ || process.env.WORLD_TICK_HZ || '10'),
        astSyncBudgetMs: parseInt(process.env.WATCHDOG_AST_SYNC_BUDGET_MS || '50')
    };

    private astSync = new AstInterfaceSync({
        strict: this.config.strict,
        tickHz: this.config.tickHz,
        maxSyncBudgetMs: this.config.astSyncBudgetMs,
        safeJson: true,
        useBigInt: true,
        failOnBudgetOverrun: process.env.WATCHDOG_AST_SYNC_FAIL_ON_OVERRUN === 'true',
        preserveSchemaOrder: true
    });

    public registerSchema(modelName: string, schema: ModelSchema): void {
        this.modelRegistry.set(modelName, schema);
    }

    private evaluateBreaker(): boolean {
        if (this.breakerState === BreakerState.OPEN) {
            const now = Date.now();
            if (now - this.lastFailureTime > this.config.resetTimeoutMs) {
                console.warn('[Watchdog] Circuit Breaker: Transitioning to HALF_OPEN. Probing connection...');
                this.breakerState = BreakerState.HALF_OPEN;
                return true;
            }
            return false;
        }
        return true;
    }

    private recordSuccess(): void {
        if (this.breakerState === BreakerState.HALF_OPEN) {
            console.log('[Watchdog] Circuit Breaker: Connection restored. State CLOSED.');
        }
        this.failureCount = 0;
        this.breakerState = BreakerState.CLOSED;
    }

    private recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.config.breakerThreshold) {
            this.breakerState = BreakerState.OPEN;
            console.error(`[Watchdog] Circuit Breaker OPENED after ${this.failureCount} sequential failures.`);
        }
    }

    private createDiagnostic(code: string, error?: any, latency?: number): DiagnosticPayload {
        return {
            code,
            breakerState: this.breakerState,
            failureCount: this.failureCount,
            latencyMs: latency,
            stack: error instanceof Error ? error.stack : undefined,
            recoverySuggestion: this.getRecoverySuggestion(code)
        };
    }

    private getRecoverySuggestion(code: string): string {
        switch (code) {
            case 'DB_TIMEOUT': return 'Increase DB instance performance or check network latency.';
            case 'ECONNREFUSED': return 'Database server is down or port is blocked.';
            case 'SCHEMA_DRIFT': return 'Execute prisma migrate dev or run the generated reconciliation script.';
            case 'AST_SYNC_BUDGET_OVERRUN': return 'Move interface sync to a maintenance pass or lower WATCHDOG_AST_SYNC_BUDGET_MS pressure.';
            case 'WS_UNREACHABLE': return 'Check if the Watchdog Monitoring Gateway is online.';
            default: return 'Check internal logs for deep-trace analysis.';
        }
    }

    public async performHealthCheck(dbClient: any): Promise<HealthCheckResult> {
        if (!this.evaluateBreaker()) {
            return { status: HealthStatus.CIRCUIT_OPEN, breaker: this.breakerState, error: 'Circuit Breaker is OPEN' };
        }

        const start = Date.now();
        try {
            await Promise.race([
                dbClient.query('SELECT 1'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), this.config.healthCheckTimeoutMs))
            ]);

            const latency = Date.now() - start;
            this.recordSuccess();

            return {
                status: latency > 1500 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
                latencyMs: latency,
                breaker: this.breakerState
            };
        } catch (err: any) {
            this.recordFailure();
            return {
                status: HealthStatus.UNHEALTHY,
                breaker: this.breakerState,
                error: err.message
            };
        }
    }

    private async checkExternalServices(): Promise<void> {
        try {
            const isEmitterAlive = await this.emitter.ping(this.config.externalServiceTimeoutMs);
            if (!isEmitterAlive) {
                this.addToAudit('EMITTER', 'ERROR', IntegrityCategory.EXTERNAL_SERVICE_OFFLINE,
                    'Watchdog Emitter Gateway is unreachable',
                    this.createDiagnostic('WS_UNREACHABLE'), false);
            }
        } catch (err) {
            console.error('[Watchdog] External service check failed:', err);
        }
    }

    public async checkDatabaseHealth(dbClient: any): Promise<AuditEntry[]> {
        this.auditReport = [];

        await this.checkExternalServices();

        const health = await this.performHealthCheck(dbClient);

        if (health.status === HealthStatus.UNHEALTHY || health.status === HealthStatus.CIRCUIT_OPEN) {
            const diag = this.createDiagnostic(health.error || 'HEALTH_CHECK_FAILED', null, health.latencyMs);
            this.handleConnectionError(new Error(health.error || 'Health check failed'), 'PRE_STAGE_HEALTH');
            this.addToAudit(
                'GLOBAL',
                'INFRA_OFFLINE',
                IntegrityCategory.HEALTH_CHECK_FAILED,
                `Database health check failed: ${health.error}`,
                diag,
                true
            );
            return this.auditReport;
        }

        for (const [modelName, expectedSchema] of this.modelRegistry.entries()) {
            try {
                const start = Date.now();
                const actualColumns = await this.fetchActualSchema(dbClient, expectedSchema.tableName);
                const diff = SchemaDiff.compare({ properties: expectedSchema.properties }, { columns: actualColumns });

                if (diff.additions.length > 0 || diff.removals.length > 0 || diff.changes.length > 0) {
                    const migrationPath = MigrationGenerator.generate(diff, expectedSchema.tableName, this.config.migrationDir);
                    const diag = this.createDiagnostic('SCHEMA_DRIFT', null, Date.now() - start);

                    this.addToAudit(modelName, 'DRIFT', IntegrityCategory.SCHEMA_DRIFT,
                        `Structural mismatch in ${expectedSchema.tableName}. Recon Engine action required.`,
                        { diff, migrationPath, ...diag }, this.config.strict
                    );

                    if (migrationPath) {
                        this.learning.record({ type: 'SCHEMA_DRIFT', payload: { tableName: expectedSchema.tableName, migrationPath } });
                    }
                }

                const actualConstraints = await ConstraintValidator.fetchConstraints(dbClient, expectedSchema.tableName);
                const constraintStatus = await ConstraintValidator.validate(expectedSchema, actualConstraints);

                if (!constraintStatus.valid) {
                    this.addToAudit(modelName, 'VALIDATION_FAILED', IntegrityCategory.CONSTRAINT_VIOLATION,
                        `Constraint violation detected for ${expectedSchema.tableName}`,
                        { missing: constraintStatus.missing, unexpected: constraintStatus.unexpected }, true
                    );
                } else {
                    this.addToAudit(modelName, 'SUCCESS', IntegrityCategory.VALIDATION_ERROR,
                        `Integrity verified for ${expectedSchema.tableName}`, null, false
                    );
                }

            } catch (error: any) {
                if (this.isConnectionError(error)) {
                    this.recordFailure();
                    const diag = this.createDiagnostic(error.code || 'CONNECTION_LOST', error);
                    this.handleConnectionError(error, modelName);
                    this.addToAudit(modelName, 'CONNECTION_LOST', IntegrityCategory.CONNECTION,
                        `Lost connection during verification of ${modelName}: ${error.message}`, diag, true
                    );
                    break;
                } else {
                    const diag = this.createDiagnostic('INTERNAL_ERROR', error);
                    this.addToAudit(modelName, 'ERROR', IntegrityCategory.VALIDATION_ERROR,
                        `Internal Logic Error during check for ${modelName}: ${error.message}`, diag, true
                    );
                }
            }
        }

        this.syncWithStateReconstructionEngine();
        return this.auditReport;
    }

    private syncWithStateReconstructionEngine(): void {
        const criticalIssues = this.auditReport.filter(a => a.isCritical);

        if (criticalIssues.length > 0) {
            console.error(`[StateReconstructionEngine] ALERT: Found ${criticalIssues.length} critical integrity violations.`);

            try {
                this.emitter.emit('RECONSTRUCTION_REQUIRED', {
                    timestamp: new Date().toISOString(),
                    tickHz: this.config.tickHz,
                    issues: criticalIssues,
                    remediation: criticalIssues.map(i => {
                        if (i.category === IntegrityCategory.SCHEMA_DRIFT) return 'RUN_MIGRATIONS';
                        if (i.category === IntegrityCategory.HEALTH_CHECK_FAILED) return 'CHECK_INFRASTRUCTURE';
                        return 'MANUAL_INTERVENTION';
                    })
                }, 'CRITICAL');
            } catch (e) {
                console.error('[Watchdog] Could not notify Reconstruction Engine - Emitter offline.');
            }
        }

        try {
            this.emitter.emit('INTEGRITY_SUMMARY', {
                tickHz: this.config.tickHz,
                astSyncBudgetMs: this.config.astSyncBudgetMs,
                insights: this.learning.getInsights(),
                auditTrail: this.auditReport
            });
        } catch (e) {
            // Summary failure is not critical
        }
    }

    private addToAudit(
        model: string,
        status: AuditEntry['status'],
        category: IntegrityCategory,
        message: string,
        details: any = null,
        isCritical: boolean = false
    ): void {
        const entry: AuditEntry = {
            timestamp: new Date().toISOString(),
            model,
            status,
            category,
            message,
            isCritical
        };

        if (details && details.breakerState) {
            entry.diagnostics = details;
        } else {
            entry.details = details;
        }

        this.auditReport.push(entry);
    }

    private async fetchActualSchema(dbClient: any, tableName: string): Promise<any[]> {
        const query = `
            SELECT column_name as name, data_type as type, is_nullable as nullable
            FROM information_schema.columns
            WHERE table_name = $1;
        `;
        const res = await dbClient.query(query, [tableName]);
        return res.rows.map((r: any) => ({
            name: r.name,
            type: r.type,
            nullable: r.nullable === 'YES'
        }));
    }

    private isConnectionError(error: any): boolean {
        const connectionCodes = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', '57P01', '08000', '08003', '08006', '57P03', 'ECONNRESET'];
        return (error.code && connectionCodes.includes(error.code)) ||
               error.message?.toLowerCase().includes('connection') ||
               error.message?.toLowerCase().includes('refused') ||
               error.message === 'DB_TIMEOUT';
    }

    private handleConnectionError(error: any, context: string): void {
        const diagnostics = this.createDiagnostic(error.code || 'INFRA_FAILURE', error);

        console.error('====================================================');
        console.error(`[Watchdog] CRITICAL CONNECTION ERROR @ ${context}`);
        console.error(`[Watchdog] Code: ${diagnostics.code} | State: ${this.breakerState}`);
        console.error(`[Watchdog] Message: ${error.message}`);
        console.error('====================================================');

        try {
            this.emitter.emit('SYSTEM_CRITICAL', {
                point: LogicPoint.PERSISTENCE,
                error: 'DB_CONNECTION_FAILURE',
                diagnostics: {
                    ...diagnostics,
                    context,
                    scope: 'INFRASTRUCTURE_OFFLINE'
                }
            }, 'CRITICAL');
        } catch (e) {
            // Fallback to console if emitter fails
        }
    }

    public synchronizeAxioms(interfacesPath: string): AstInterfaceSyncResult[] {
        const startedAt = Date.now();
        const results = this.astSync.syncBatchWithinTickBudget(interfacesPath, this.modelRegistry.entries(), {
            strict: this.config.strict,
            tickHz: this.config.tickHz,
            maxSyncBudgetMs: this.config.astSyncBudgetMs,
            failOnBudgetOverrun: process.env.WATCHDOG_AST_SYNC_FAIL_ON_OVERRUN === 'true'
        });

        for (const result of results) {
            if (result.budgetOverrun) {
                this.addToAudit(
                    result.interfaceName,
                    'DEGRADED',
                    IntegrityCategory.SCHEMA_DRIFT,
                    `AST interface sync exceeded deterministic tick budget: ${result.durationMs}ms > ${result.maxSyncBudgetMs}ms`,
                    { ...this.createDiagnostic('AST_SYNC_BUDGET_OVERRUN', null, result.durationMs), result },
                    false
                );
            }
        }

        try {
            this.emitter.emit('AST_INTERFACE_SYNC_SUMMARY', {
                tickHz: this.config.tickHz,
                tickBudgetMs: Math.floor(1000 / this.config.tickHz),
                budgetMs: this.config.astSyncBudgetMs,
                durationMs: Date.now() - startedAt,
                results
            });
        } catch (e) {
            // Emitter failure must never block deterministic watchdog sync.
        }

        return results;
    }

    public getAuditReport(): AuditEntry[] {
        return this.auditReport;
    }
}

export const integrityChecker = new SovereignWatchdog();

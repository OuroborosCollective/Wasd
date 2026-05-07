import * as fs from 'fs';
import * as path from 'path';
import { AstInterfaceSync } from './ast-interface-sync';
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
    TIMEOUT = 'TIMEOUT'
}

export interface WatchdogConfig {
    strict: boolean;
    autoFix: boolean;
    migrationDir: string;
    breakerThreshold: number;
    resetTimeoutMs: number;
    queryTimeoutMs: number;
}

export interface ModelSchema {
    tableName: string;
    properties: any[];
}

export interface AuditEntry {
    timestamp: string;
    model: string;
    status: 'SUCCESS' | 'DRIFT' | 'ERROR' | 'CONNECTION_LOST' | 'VALIDATION_FAILED' | 'TIMEOUT';
    category: IntegrityCategory;
    message: string;
    details?: any;
    isCritical: boolean;
}

export class SovereignWatchdog {
    private astSync = new AstInterfaceSync();
    private emitter = new WatchdogEmitter('ws://localhost:8080');
    private learning = new WatchdogLearning();
    private modelRegistry: Map<string, ModelSchema> = new Map();
    private auditReport: AuditEntry[] = [];
    
    private breakerState: BreakerState = BreakerState.CLOSED;
    private failureCount = 0;
    private lastFailureTime: number = 0;

    private config: WatchdogConfig = {
        strict: process.env.WATCHDOG_STRICT === 'true',
        autoFix: false,
        migrationDir: './migrations',
        breakerThreshold: 3,
        resetTimeoutMs: 30000,
        queryTimeoutMs: 5000
    };

    public registerSchema(modelName: string, schema: ModelSchema): void {
        this.modelRegistry.set(modelName, schema);
    }

    private evaluateBreaker(): boolean {
        if (this.breakerState === BreakerState.OPEN) {
            const now = Date.now();
            if (now - this.lastFailureTime > this.config.resetTimeoutMs) {
                console.warn('[Watchdog] Circuit Breaker: Attempting HALF_OPEN state reset.');
                this.breakerState = BreakerState.HALF_OPEN;
                return true;
            }
            return false;
        }
        return true;
    }

    private recordSuccess(): void {
        this.failureCount = 0;
        this.breakerState = BreakerState.CLOSED;
    }

    private recordFailure(): void {
        this.failureCount++;
        if (this.failureCount >= this.config.breakerThreshold) {
            this.breakerState = BreakerState.OPEN;
            this.lastFailureTime = Date.now();
            console.error(`[Watchdog] Circuit Breaker OPENED after ${this.failureCount} failures.`);
        }
    }

    private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error('WATCHDOG_TIMEOUT')), timeoutMs);
        });

        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timeoutHandle!);
            return result;
        } catch (error) {
            clearTimeout(timeoutHandle!);
            throw error;
        }
    }

    /**
     * Resilient Integrity Flow with Timeout-Protection and Controlled Fail-State.
     */
    public async checkDatabaseHealth(dbClient: any): Promise<AuditEntry[]> {
        this.auditReport = [];

        if (!this.evaluateBreaker()) {
            const msg = '[Watchdog] Execution skipped: Circuit Breaker is OPEN.';
            this.addToAudit('GLOBAL', 'CONNECTION_LOST', IntegrityCategory.INFRASTRUCTURE, msg, { breaker: 'OPEN' }, true);
            return this.auditReport;
        }

        if (!dbClient) {
            this.handleConnectionError(new Error('Missing dbClient instance'), 'VALIDATION_INIT');
            this.addToAudit('GLOBAL', 'ERROR', IntegrityCategory.INFRASTRUCTURE, 'Database client instance is undefined.', null, true);
            return this.auditReport;
        }

        // Step 1: Core Connectivity check
        try {
            await this.executeWithTimeout(dbClient.query('SELECT 1'), this.config.queryTimeoutMs);
            this.recordSuccess();
        } catch (error: any) {
            this.recordFailure();
            const isTimeout = error.message === 'WATCHDOG_TIMEOUT';
            const status = isTimeout ? 'TIMEOUT' : 'CONNECTION_LOST';
            const category = isTimeout ? IntegrityCategory.TIMEOUT : IntegrityCategory.CONNECTION;
            
            this.handleConnectionError(error, 'INITIAL_CONNECT');
            this.addToAudit('GLOBAL', status, category, `Database unreachable: ${error.message}`, null, true);
            return this.auditReport; // Immediate termination on infrastructure fail
        }

        // Step 2: Iterate through registered models for structural integrity
        for (const [modelName, expectedSchema] of this.modelRegistry.entries()) {
            try {
                // Fetch Actual Schema with timeout
                const actualColumns = await this.executeWithTimeout(
                    this.fetchActualSchema(dbClient, expectedSchema.tableName),
                    this.config.queryTimeoutMs
                );
                
                // Compare Schema (Drift Check)
                const diff = SchemaDiff.compare({ properties: expectedSchema.properties }, { columns: actualColumns });

                if (diff.additions.length > 0 || diff.removals.length > 0 || diff.changes.length > 0) {
                    const migrationPath = MigrationGenerator.generate(diff, expectedSchema.tableName, this.config.migrationDir);
                    
                    this.addToAudit(modelName, 'DRIFT', IntegrityCategory.SCHEMA_DRIFT, 
                        `Structural mismatch in ${expectedSchema.tableName}. Recon Engine action required.`, 
                        { diff, migrationPath }, this.config.strict
                    );

                    if (migrationPath) {
                        this.learning.record({ type: 'SCHEMA_DRIFT', payload: { tableName: expectedSchema.tableName, migrationPath } });
                    }
                }

                // Constraint Integrity Check
                const actualConstraints = await this.executeWithTimeout(
                    ConstraintValidator.fetchConstraints(dbClient, expectedSchema.tableName),
                    this.config.queryTimeoutMs
                );
                
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
                    this.handleConnectionError(error, modelName);
                    this.addToAudit(modelName, 'CONNECTION_LOST', IntegrityCategory.CONNECTION, 
                        `Lost connection during verification of ${modelName}: ${error.message}`, null, true
                    );
                    break; // Stop iterating on connection loss
                } else if (error.message === 'WATCHDOG_TIMEOUT') {
                    this.addToAudit(modelName, 'TIMEOUT', IntegrityCategory.TIMEOUT, 
                        `Operation timed out for ${modelName}`, null, true
                    );
                } else {
                    this.addToAudit(modelName, 'ERROR', IntegrityCategory.VALIDATION_ERROR, 
                        `Internal Logic Error during check for ${modelName}: ${error.message}`, { stack: error.stack }, true
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
            this.emitter.emit('RECONSTRUCTION_REQUIRED', {
                timestamp: new Date().toISOString(),
                issues: criticalIssues,
                remediation: criticalIssues.map(i => {
                    if (i.category === IntegrityCategory.SCHEMA_DRIFT) return 'RUN_MIGRATIONS';
                    if (i.category === IntegrityCategory.CONNECTION || i.category === IntegrityCategory.TIMEOUT) return 'CHECK_DB_NODES';
                    return 'MANUAL_INSPECTION';
                })
            }, 'CRITICAL');
        }

        this.emitter.emit('INTEGRITY_SUMMARY', { 
            insights: this.learning.getInsights(),
            auditTrail: this.auditReport 
        });
    }

    private addToAudit(
        model: string, 
        status: AuditEntry['status'], 
        category: IntegrityCategory, 
        message: string, 
        details: any = null, 
        isCritical: boolean = false
    ): void {
        this.auditReport.push({
            timestamp: new Date().toISOString(),
            model,
            status,
            category,
            message,
            details,
            isCritical
        });
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
               error.message === 'WATCHDOG_TIMEOUT';
    }

    private handleConnectionError(error: any, context: string): void {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            context: context,
            code: error.code || 'INFRA_FAILURE',
            message: error.message,
            breaker: this.breakerState,
            failureCount: this.failureCount,
            scope: 'INFRASTRUCTURE_OFFLINE'
        };

        console.error('====================================================');
        console.error(`[Watchdog] CRITICAL PERSISTENCE ERROR @ ${context}`);
        console.error(`[Watchdog] Status: ${this.breakerState} | Reason: ${diagnostics.message}`);
        console.error('====================================================');

        this.emitter.emit('SYSTEM_CRITICAL', { 
            point: LogicPoint.PERSISTENCE, 
            error: error.message === 'WATCHDOG_TIMEOUT' ? 'DB_TIMEOUT' : 'DB_CONNECTION_FAILURE', 
            diagnostics 
        }, 'CRITICAL');
    }

    public synchronizeAxioms(interfacesPath: string): void {
        for (const [modelName, schema] of this.modelRegistry.entries()) {
            const interfacePath = path.join(interfacesPath, `${modelName}.ts`);
            if (fs.existsSync(interfacePath)) {
                this.astSync.syncInterfaceWithSchema(interfacePath, schema);
            }
        }
    }

    public getAuditReport(): AuditEntry[] {
        return this.auditReport;
    }
}

export const integrityChecker = new SovereignWatchdog();
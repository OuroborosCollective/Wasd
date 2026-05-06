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
    TELEMETRY = 'TELEMETRY'
}

export enum BreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export interface WatchdogConfig {
    strict: boolean;
    autoFix: boolean;
    migrationDir: string;
    breakerThreshold: number;
    resetTimeoutMs: number;
}

export interface ModelSchema {
    tableName: string;
    properties: any[];
}

export interface AuditEntry {
    timestamp: string;
    model: string;
    status: 'SUCCESS' | 'DRIFT' | 'ERROR' | 'CONNECTION_LOST';
    message: string;
    details?: any;
}

export class SovereignWatchdog {
    private astSync = new AstInterfaceSync();
    private emitter = new WatchdogEmitter('ws://localhost:8080');
    private learning = new WatchdogLearning();
    private modelRegistry: Map<string, ModelSchema> = new Map();
    private auditReport: AuditEntry[] = [];
    
    // Circuit Breaker State
    private breakerState: BreakerState = BreakerState.CLOSED;
    private failureCount = 0;
    private lastFailureTime: number = 0;

    private config: WatchdogConfig = {
        strict: process.env.WATCHDOG_STRICT === 'true',
        autoFix: false,
        migrationDir: './migrations',
        breakerThreshold: 3,
        resetTimeoutMs: 30000 // 30 seconds
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

    /**
     * Haupt-Runtime-Flow des Watchdogs.
     * DB-Fehler werden gefangen und in den Audit-Report geschrieben.
     * Verhindert unkontrollierten Prozess-Absturz.
     */
    public async checkDatabaseHealth(dbClient: any): Promise<AuditEntry[]> {
        this.auditReport = []; // Reset for current run

        if (!this.evaluateBreaker()) {
            const msg = '[Watchdog] Execution skipped: Circuit Breaker is OPEN.';
            console.warn(msg);
            this.addToAudit('GLOBAL', 'CONNECTION_LOST', msg);
            return this.auditReport;
        }

        console.log('[Watchdog] Starting Resilient Runtime Integrity Flow...');

        try {
            // Initialer Verbindungstest
            await Promise.race([
                dbClient.query('SELECT 1'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 5000))
            ]);
            this.recordSuccess();
        } catch (connError: any) {
            this.recordFailure();
            this.handleConnectionError(connError, 'INITIAL_CONNECT');
            this.addToAudit('GLOBAL', 'CONNECTION_LOST', `Initial connection failed: ${connError.message}`);
            return this.auditReport; 
        }

        for (const [modelName, expectedSchema] of this.modelRegistry.entries()) {
            try {
                // 1. Read DB schema
                const actualColumns = await this.fetchActualSchema(dbClient, expectedSchema.tableName);
                
                // 2. Compute diff
                const diff = SchemaDiff.compare({ properties: expectedSchema.properties }, { columns: actualColumns });

                // 3. Handle Drift
                if (diff.additions.length > 0 || diff.removals.length > 0 || diff.changes.length > 0) {
                    this.emitter.emit('SCHEMA_DRIFT', { tableName: expectedSchema.tableName, diff }, 'HIGH');
                    
                    const migrationPath = MigrationGenerator.generate(diff, expectedSchema.tableName, this.config.migrationDir);
                    if (migrationPath) {
                        this.learning.record({ type: 'SCHEMA_DRIFT', payload: { tableName: expectedSchema.tableName, migrationPath } });
                    }

                    this.addToAudit(modelName, 'DRIFT', `Schema drift in ${expectedSchema.tableName}`, { diff, migrationPath });
                } else {
                    this.addToAudit(modelName, 'SUCCESS', `Schema integrity verified for ${expectedSchema.tableName}`);
                }

                // 4. Validate constraints
                const actualConstraints = await ConstraintValidator.fetchConstraints(dbClient, expectedSchema.tableName);
                this.emitter.emit('CONSTRAINT_SNAPSHOT', { tableName: expectedSchema.tableName, constraints: actualConstraints });

            } catch (error: any) {
                if (this.isConnectionError(error)) {
                    this.recordFailure();
                    this.handleConnectionError(error, modelName);
                    this.addToAudit(modelName, 'CONNECTION_LOST', `Database connection lost during ${modelName} check: ${error.message}`);
                    
                    // Bei Verbindungsabbruch während der Iteration brechen wir die Schleife ab,
                    // beenden aber nicht den Prozess.
                    break;
                } else {
                    const errorMsg = `Logic Error during health check for ${modelName}: ${error.message}`;
                    console.error(`[Watchdog] ${errorMsg}`);
                    this.addToAudit(modelName, 'ERROR', errorMsg);
                    
                    if (this.config.strict) {
                        console.warn(`[Watchdog] Strict mode active: Logic violation logged for ${modelName}.`);
                    }
                }
            }
        }

        this.emitter.emit('INTEGRITY_SUMMARY', { 
            insights: this.learning.getInsights(),
            auditTrail: this.auditReport 
        });

        return this.auditReport;
    }

    private addToAudit(model: string, status: AuditEntry['status'], message: string, details?: any): void {
        this.auditReport.push({
            timestamp: new Date().toISOString(),
            model,
            status,
            message,
            details
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
        const connectionCodes = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', '57P01', '08000', '08003', '08006', '57P03'];
        return (error.code && connectionCodes.includes(error.code)) || 
               error.message?.toLowerCase().includes('connection') || 
               error.message?.toLowerCase().includes('refused') ||
               error.message === 'DB_TIMEOUT';
    }

    private handleConnectionError(error: any, context: string): void {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            context: context,
            code: error.code || 'UNKNOWN_CODE',
            message: error.message,
            breaker: this.breakerState,
            failureCount: this.failureCount,
            env: {
                DB_HOST: process.env.DB_HOST || 'not-set',
                DB_PORT: process.env.DB_PORT || 'not-set',
                NODE_ENV: process.env.NODE_ENV
            }
        };

        console.error('====================================================');
        console.error(`[Watchdog] DB RESILIENCE HANDLER @ ${context}`);
        console.error(`[Watchdog] Status: ${this.breakerState} | Failures: ${this.failureCount}`);
        console.error(`[Watchdog] Error: ${error.message}`);
        console.error('====================================================');

        this.emitter.emit('SYSTEM_CRITICAL', { 
            point: LogicPoint.PERSISTENCE, 
            error: error.message === 'DB_TIMEOUT' ? 'DB_TIMEOUT' : 'DB_CONNECTION_LOST', 
            diagnostics 
        }, 'CRITICAL');
    }

    public synchronizeAxioms(interfacesPath: string): void {
        console.log('[Watchdog] Synchronizing TS Interfaces via AST...');
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
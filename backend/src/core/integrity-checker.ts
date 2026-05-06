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

export interface WatchdogConfig {
    strict: boolean;
    autoFix: boolean;
    migrationDir: string;
}

export interface ModelSchema {
    tableName: string;
    properties: any[];
}

export class SovereignWatchdog {
    private astSync = new AstInterfaceSync();
    private emitter = new WatchdogEmitter('ws://localhost:8080');
    private learning = new WatchdogLearning();
    private modelRegistry: Map<string, ModelSchema> = new Map();
    private config: WatchdogConfig = {
        strict: process.env.WATCHDOG_STRICT === 'true',
        autoFix: false,
        migrationDir: './migrations'
    };

    public registerSchema(modelName: string, schema: ModelSchema): void {
        this.modelRegistry.set(modelName, schema);
    }

    /**
     * Haupt-Runtime-Flow des Watchdogs mit Graceful-Handling für Verbindungsfehler.
     */
    public async checkDatabaseHealth(dbClient: any): Promise<void> {
        console.log('[Watchdog] Starting Runtime Integrity Flow...');

        // Vorab-Check der Verbindung
        try {
            await dbClient.query('SELECT 1');
        } catch (connError) {
            this.handleConnectionError(connError, 'INITIAL_CONNECT');
            if (this.config.strict) {
                throw new Error('[Watchdog] Strict mode: Aborting due to database connection failure.');
            }
            return; // Beende diesen Health-Check-Lauf, aber crashe nicht den Prozess
        }

        for (const [modelName, expectedSchema] of this.modelRegistry.entries()) {
            try {
                // 1. Read DB schema (Actual)
                const actualColumns = await this.fetchActualSchema(dbClient, expectedSchema.tableName);
                
                // 2. Compute diff
                const diff = SchemaDiff.compare({ properties: expectedSchema.properties }, { columns: actualColumns });

                // 3. Emit structured event & Handle Drift
                if (diff.additions.length > 0 || diff.removals.length > 0 || diff.changes.length > 0) {
                    this.emitter.emit('SCHEMA_DRIFT', { tableName: expectedSchema.tableName, diff }, 'HIGH');
                    
                    // 4. Generate SQL suggestion
                    const migrationPath = MigrationGenerator.generate(diff, expectedSchema.tableName, this.config.migrationDir);
                    if (migrationPath) {
                        this.learning.record({ type: 'SCHEMA_DRIFT', payload: { tableName: expectedSchema.tableName, migrationPath } });
                    }

                    if (this.config.strict) {
                        throw new Error(`Critical Schema Drift detected in table ${expectedSchema.tableName}`);
                    }
                }

                // 5. Validate constraints
                const actualConstraints = await ConstraintValidator.fetchConstraints(dbClient, expectedSchema.tableName);
                this.emitter.emit('CONSTRAINT_SNAPSHOT', { tableName: expectedSchema.tableName, constraints: actualConstraints });

            } catch (error: any) {
                if (this.isConnectionError(error)) {
                    this.handleConnectionError(error, modelName);
                } else {
                    console.error(`[Watchdog] Error during health check for ${modelName}:`, error.message);
                }
                
                if (this.config.strict) throw error;
            }
        }

        this.emitter.emit('INTEGRITY_SUMMARY', { insights: this.learning.getInsights() });
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

    /**
     * Prüft, ob ein Fehler auf ein Netzwerk-/Verbindungsproblem hindeutet.
     */
    private isConnectionError(error: any): boolean {
        const connectionCodes = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', '57P01', '08000', '08003', '08006'];
        return error.code && connectionCodes.includes(error.code) || 
               error.message?.includes('connection') || 
               error.message?.includes('refused');
    }

    /**
     * Detaillierte Diagnose bei Verbindungsfehlern.
     */
    private handleConnectionError(error: any, context: string): void {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            context: context,
            code: error.code || 'UNKNOWN_CODE',
            message: error.message,
            stack: error.stack,
            env: {
                DB_HOST: process.env.DB_HOST || 'not-set',
                DB_PORT: process.env.DB_PORT || 'not-set',
                NODE_ENV: process.env.NODE_ENV
            }
        };

        console.error('====================================================');
        console.error(`[Watchdog] DATABASE CONNECTION ERROR @ ${context}`);
        console.error(`[Watchdog] Diagnosis:`, JSON.stringify(diagnostics, null, 2));
        console.error('====================================================');

        this.emitter.emit('SYSTEM_CRITICAL', { 
            point: LogicPoint.PERSISTENCE, 
            error: 'DB_CONNECTION_LOST', 
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
}

export const integrityChecker = new SovereignWatchdog();
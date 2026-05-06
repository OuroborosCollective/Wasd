import * as fs from 'fs';
import * as path from 'path';

/**
 * LOGIC POINTS DER SOUVERÄNEN ARCHITEKTUR
 * Repräsentiert die 13 dimensionalen Ankerpunkte der Areloria-Wahrheitsmatrix.
 */
export enum LogicPoint {
    PERSISTENCE = 'PERSISTENCE',   // DB-Schema & Connection Health
    INTERFACE = 'INTERFACE',       // TypeScript Definitionen
    TRANSPORT = 'TRANSPORT',       // API/DTO
    ENGINE = 'ENGINE',             // Three.js Core
    AGENT = 'AGENT',               // Jules AI Logic
    SECURITY = 'SECURITY',         // Auth/ACL
    ASSET = 'ASSET',               // Pipeline Assets
    NETWORK = 'NETWORK',           // WebSocket Sync
    STATE = 'STATE',               // Global Store
    LOGIC = 'LOGIC',               // Business Rules
    REPO = 'REPO',                // Monorepo Structure
    DEPLOY = 'DEPLOY',             // Docker/CI
    TELEMETRY = 'TELEMETRY'        // Logs/Metrics
}

export interface Axiom {
    id: string;
    logicPoint: LogicPoint;
    expectedState: any;
    actualState?: any;
    lastValidated: Date;
    isViolated: boolean;
    errorCode?: string;
}

export interface PropertyMetadata {
    name: string;
    type: string;
    nullable: boolean;
}

export interface ModelSchema {
    tableName: string;
    properties: PropertyMetadata[];
}

export interface DatabaseMetrics {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
}

export interface SchemaValidationResult {
    tableName: string;
    exists: boolean;
    missingColumns: string[];
    typeMismatches: string[];
}

export interface HealthReport {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    latency: number;
    connectionCode: string;
    message: string;
    metrics?: DatabaseMetrics;
    schemaValidation?: SchemaValidationResult[];
}

/**
 * SOVEREIGN WATCHDOG
 * Überwacht das Code-Regalsystem auf Basis der Kappa-kohärenten Wahrheitsmatrix.
 * Führt zyklische Konsistenzprüfungen durch und leitet Korrekturmaßnahmen ein.
 */
export class SovereignWatchdog {
    private readonly truthMatrix: Map<string, Axiom> = new Map();
    private readonly modelRegistry: Map<string, ModelSchema> = new Map();

    constructor() {
        this.initializeLogicPoints();
    }

    private initializeLogicPoints(): void {
        Object.values(LogicPoint).forEach(point => {
            this.truthMatrix.set(point, {
                id: `AXIOM_${point}`,
                logicPoint: point,
                expectedState: {},
                lastValidated: new Date(),
                isViolated: false
            });
        });
    }

    /**
     * Registriert ein Datenbankschema in der PERSISTENCE-Schicht der Matrix.
     */
    public registerSchema(modelName: string, schema: ModelSchema): void {
        this.modelRegistry.set(modelName, schema);
        const persistenceAxiom = this.truthMatrix.get(LogicPoint.PERSISTENCE);
        if (persistenceAxiom) {
            persistenceAxiom.expectedState[modelName] = schema;
            persistenceAxiom.lastValidated = new Date();
        }
    }

    /**
     * Erweiterter Datenbank-Heartbeat-Check für CI/CD und Runtime-Monitoring.
     * Validiert Pool-Status, Latenz und Schema-Integrität.
     */
    public async checkDatabaseHealth(dbClient: any): Promise<HealthReport> {
        const start = Date.now();
        const persistenceAxiom = this.truthMatrix.get(LogicPoint.PERSISTENCE)!;
        const schemaResults: SchemaValidationResult[] = [];
        
        try {
            // 1. Connection & Latency Check
            await dbClient.query('SELECT 1');
            const latency = Date.now() - start;

            // 2. Pool Metrics (Extraktion falls dbClient ein Pool-Objekt ist)
            const metrics: DatabaseMetrics = {
                totalConnections: dbClient.totalCount || 0,
                idleConnections: dbClient.idleCount || 0,
                waitingClients: dbClient.waitingCount || 0
            };

            // 3. Schema-Validität gegen ModelRegistry
            for (const [modelName, schema] of this.modelRegistry.entries()) {
                const validation = await this.validateTableSchema(dbClient, schema);
                schemaResults.push(validation);
            }

            const schemaViolations = schemaResults.filter(r => !r.exists || r.missingColumns.length > 0 || r.typeMismatches.length > 0);
            const isDegraded = schemaViolations.length > 0;

            const report: HealthReport = {
                status: isDegraded ? 'DEGRADED' : 'HEALTHY',
                latency,
                connectionCode: 'SQL_OK_200',
                message: isDegraded 
                    ? `Persistence layer operational but schema mismatches detected: ${schemaViolations.map(v => v.tableName).join(', ')}`
                    : 'Persistence layer and schema fully coherent.',
                metrics,
                schemaValidation: schemaResults
            };

            persistenceAxiom.actualState = report;
            persistenceAxiom.isViolated = isDegraded;
            persistenceAxiom.errorCode = isDegraded ? 'SCHEMA_MISMATCH' : undefined;
            
            if (isDegraded) {
                console.warn(`[Sovereign Watchdog] Schema Degradation: ${report.message}`);
            }

            return report;
            
        } catch (error: any) {
            const errorCode = error.code || 'DB_CONN_ERR';
            const report: HealthReport = {
                status: 'CRITICAL',
                latency: Date.now() - start,
                connectionCode: errorCode,
                message: `Database Heartbeat Failed: ${error.message || 'Unknown error'}`
            };

            persistenceAxiom.actualState = report;
            persistenceAxiom.isViolated = true;
            persistenceAxiom.errorCode = errorCode;
            
            console.error(`[Sovereign Watchdog] CRITICAL ERROR: ${errorCode} - ${report.message}`);
            return report;
        }
    }

    /**
     * Validiert eine einzelne Tabelle gegen die Datenbank-Metadaten.
     */
    private async validateTableSchema(dbClient: any, schema: ModelSchema): Promise<SchemaValidationResult> {
        const result: SchemaValidationResult = {
            tableName: schema.tableName,
            exists: false,
            missingColumns: [],
            typeMismatches: []
        };

        try {
            // Abfrage der Information Schema Spalten
            const query = `
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = $1
            `;
            const dbColumns = await dbClient.query(query, [schema.tableName]);

            if (dbColumns.rows.length === 0) {
                result.exists = false;
                return result;
            }

            result.exists = true;
            const dbColsMap = new Map(dbColumns.rows.map((r: any) => [r.column_name, r]));

            for (const prop of schema.properties) {
                const dbCol = dbColsMap.get(prop.name);
                if (!dbCol) {
                    result.missingColumns.push(prop.name);
                } else {
                    const expectedTsType = this.mapDbTypeToTs(prop.type);
                    const actualTsType = this.mapDbTypeToTs(dbCol.data_type);
                    
                    if (expectedTsType !== actualTsType && actualTsType !== 'any') {
                        result.typeMismatches.push(`${prop.name} (Exp: ${prop.type}, Got: ${dbCol.data_type})`);
                    }
                }
            }

            return result;
        } catch (e) {
            console.error(`[Sovereign Watchdog] Error validating schema for ${schema.tableName}`);
            return result;
        }
    }

    /**
     * Der Orakel-Prozess: Validiert Axiome gegen die Realität und korrigiert Abweichungen.
     */
    public synchronizeAxioms(interfacesPath: string): void {
        console.log('[Sovereign Watchdog] Starting Kappa-coherent cycle...');
        
        this.validatePersistenceToInterface(interfacesPath);
        this.consultOracle();
        
        console.log('[Sovereign Watchdog] Cycle complete. Matrix stabilized.');
    }

    /**
     * Überprüft die Konsistenz zwischen DB (PERSISTENCE) und TS-Interfaces (INTERFACE).
     */
    private validatePersistenceToInterface(interfacesPath: string): void {
        const interfaceAxiom = this.truthMatrix.get(LogicPoint.INTERFACE)!;
        
        for (const [modelName, schema] of this.modelRegistry.entries()) {
            const filePath = path.join(interfacesPath, `${modelName.toLowerCase()}.interface.ts`);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`[Axiom Violation] Missing interface file for model: ${modelName}`);
                interfaceAxiom.isViolated = true;
                continue;
            }

            let content = fs.readFileSync(filePath, 'utf-8');
            let hasChanges = false;

            for (const prop of schema.properties) {
                const regex = new RegExp(`(${prop.name})(\\??)(\\s*:\\s*)([^;\\s{}]+)`, 'g');
                
                content = content.replace(regex, (match, p1, p2, p3, p4) => {
                    let updatedMatch = match;
                    const isOptional = p2 === '?';
                    const targetType = this.mapDbTypeToTs(prop.type);
                    const currentType = p4.replace('[]', '');

                    if (targetType !== currentType && currentType !== 'any') {
                        console.error(`[Integrity Error] Type mismatch in ${modelName}: Field '${prop.name}' is DB:${prop.type} vs TS:${p4}`);
                        interfaceAxiom.isViolated = true;
                    }

                    if (prop.nullable !== isOptional) {
                        const newOptional = prop.nullable ? '?' : '';
                        updatedMatch = `${p1}${newOptional}${p3}${p4}`;
                        hasChanges = true;
                        console.log(`[Auto-Fix] Axiom Correction: ${modelName}.${prop.name} nullability -> ${prop.nullable}`);
                    }

                    return updatedMatch;
                });
            }

            if (hasChanges) {
                fs.writeFileSync(filePath, content, 'utf-8');
            }
        }
    }

    /**
     * Validiert API Endpunkt-Definitionen (TRANSPORT) gegen DB-Modelle.
     */
    public validateApiEndpoints(dtoPath: string, modelName: string): void {
        const schema = this.modelRegistry.get(modelName);
        if (!schema || !fs.existsSync(dtoPath)) return;

        const dtoContent = fs.readFileSync(dtoPath, 'utf-8');
        const transportAxiom = this.truthMatrix.get(LogicPoint.TRANSPORT)!;
        
        schema.properties.forEach(prop => {
            if (!prop.nullable) {
                const exists = dtoContent.includes(prop.name);
                if (!exists) {
                    console.error(`[Integrity Warning] API DTO ${dtoPath} lacks non-nullable field '${prop.name}' from model ${modelName}`);
                    transportAxiom.isViolated = true;
                }
            }
        });
    }

    /**
     * Interne Oracle-Logik zur Bewertung des Gesamtzustands der 13 LogicPoints.
     */
    private consultOracle(): void {
        const violations = Array.from(this.truthMatrix.values()).filter(a => a.isViolated);
        if (violations.length > 0) {
            console.error(`[Oracle] Found ${violations.length} Axiom violations. Intervention required.`);
            violations.forEach(v => {
                const errorCode = v.errorCode ? ` [Code: ${v.errorCode}]` : '';
                console.error(` -> Violated Point: ${v.logicPoint}${errorCode}`);
            });
        } else {
            console.log('[Oracle] All LogicPoints are in a state of sovereign coherence.');
        }
    }

    private mapDbTypeToTs(dbType: string): string {
        const mapping: Record<string, string> = {
            'varchar': 'string',
            'character varying': 'string',
            'text': 'string',
            'uuid': 'string',
            'int': 'number',
            'integer': 'number',
            'bigint': 'number',
            'float': 'number',
            'decimal': 'number',
            'numeric': 'number',
            'boolean': 'boolean',
            'bool': 'boolean',
            'timestamp': 'Date',
            'timestamp with time zone': 'Date',
            'timestamptz': 'Date',
            'date': 'Date',
            'jsonb': 'any',
            'json': 'any'
        };
        const normalized = dbType.toLowerCase().split('(')[0];
        return mapping[normalized] || 'any';
    }

    public getMatrixStatus(): Axiom[] {
        return Array.from(this.truthMatrix.values());
    }
}

export const integrityChecker = new SovereignWatchdog();
import * as fs from 'fs';
import * as path from 'path';

/**
 * LOGIC POINTS DER SOUVERÄNEN ARCHITEKTUR
 * Repräsentiert die 13 dimensionalen Ankerpunkte der Areloria-Wahrheitsmatrix.
 */
export enum LogicPoint {
    PERSISTENCE = 'PERSISTENCE',   // DB-Schema
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
                // Regex zur Identifikation der Eigenschaft: name, optionaler ?, Doppelpunkt, Typ
                const regex = new RegExp(`(${prop.name})(\\??)(\\s*:\\s*)([^;\\s{}]+)`, 'g');
                
                content = content.replace(regex, (match, p1, p2, p3, p4) => {
                    let updatedMatch = match;
                    const isOptional = p2 === '?';
                    const targetType = this.mapDbTypeToTs(prop.type);
                    const currentType = p4.replace('[]', '');

                    // 1. Typ-Validierung
                    if (targetType !== currentType && currentType !== 'any') {
                        console.error(`[Integrity Error] Type mismatch in ${modelName}: Field '${prop.name}' is DB:${prop.type} vs TS:${p4}`);
                        interfaceAxiom.isViolated = true;
                    }

                    // 2. Auto-Fix Nullability (Consistency Logic)
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
                console.error(` -> Violated Point: ${v.logicPoint}`);
            });
        } else {
            console.log('[Oracle] All LogicPoints are in a state of sovereign coherence.');
        }
    }

    /**
     * Hilfsmethode zum Mapping von DB-Typen auf TS-Basistypen.
     */
    private mapDbTypeToTs(dbType: string): string {
        const mapping: Record<string, string> = {
            'varchar': 'string',
            'text': 'string',
            'uuid': 'string',
            'int': 'number',
            'integer': 'number',
            'float': 'number',
            'decimal': 'number',
            'boolean': 'boolean',
            'bool': 'boolean',
            'timestamp': 'Date',
            'timestamptz': 'Date',
            'date': 'Date',
            'jsonb': 'any',
            'json': 'any'
        };
        const normalized = dbType.toLowerCase().split('(')[0];
        return mapping[normalized] || 'any';
    }

    /**
     * Gibt den aktuellen Status der Kappa-Matrix zurück.
     */
    public getMatrixStatus(): Axiom[] {
        return Array.from(this.truthMatrix.values());
    }
}

/**
 * Singleton Instanz des Sovereign Watchdogs.
 * Zentrales Steuerorgan für die Datenintegrität im Areloria WASD Ökosystem.
 */
export const integrityChecker = new SovereignWatchdog();
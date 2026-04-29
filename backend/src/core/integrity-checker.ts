import * as fs from 'fs';
import * as path from 'path';

export interface PropertyMetadata {
    name: string;
    type: string;
    nullable: boolean;
}

export interface ModelSchema {
    tableName: string;
    properties: PropertyMetadata[];
}

export class IntegrityChecker {
    private readonly modelRegistry: Map<string, ModelSchema> = new Map();

    /**
     * Registriert ein Datenbankschema für die Validierung.
     */
    public registerSchema(modelName: string, schema: ModelSchema): void {
        this.modelRegistry.set(modelName, schema);
    }

    /**
     * Prüft alle registrierten Modelle gegen die physischen Interface-Dateien.
     * @param interfacesPath Pfad zum Verzeichnis der TypeScript-Interfaces.
     */
    public runConsistencyCheck(interfacesPath: string): void {
        for (const [modelName, schema] of this.modelRegistry.entries()) {
            const filePath = path.join(interfacesPath, `${modelName.toLowerCase()}.interface.ts`);
            
            if (!fs.existsSync(filePath)) {
                continue;
            }

            let content = fs.readFileSync(filePath, 'utf-8');
            let hasChanges = false;

            for (const prop of schema.properties) {
                // Regex zur Identifikation der Eigenschaft im Interface
                // Matcht: fieldName, optionaler Modifikator ?, Doppelpunkt, Typ
                const regex = new RegExp(`(${prop.name})(\\??)(\\s*:\\s*)([^;\\s{}]+)`, 'g');
                
                content = content.replace(regex, (match, p1, p2, p3, p4) => {
                    let updatedMatch = match;
                    const isOptional = p2 === '?';

                    // 1. Typ-Mismatch Validierung (Logging)
                    if (this.mapDbTypeToTs(prop.type) !== p4.replace('[]', '')) {
                        console.error(`[Integrity Error] Type mismatch in ${modelName}: Field '${prop.name}' is ${prop.type} in DB but ${p4} in Interface.`);
                    }

                    // 2. Auto-Fix Null-Checks (Consistency Logic)
                    // Wenn DB nullable, Interface aber required (oder umgekehrt)
                    if (prop.nullable !== isOptional) {
                        const newOptional = prop.nullable ? '?' : '';
                        updatedMatch = `${p1}${newOptional}${p3}${p4}`;
                        hasChanges = true;
                        console.log(`[Auto-Fix] Adjusted nullability for ${modelName}.${prop.name} to ${prop.nullable ? 'optional' : 'required'}`);
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
     * Validiert API Endpunkt-Definitionen gegen DB-Modelle.
     * Prüft ob alle Pflichtfelder in den Request-Interfaces vorhanden sind.
     */
    public validateApiEndpoints(dtoPath: string, modelName: string): void {
        const schema = this.modelRegistry.get(modelName);
        if (!schema || !fs.existsSync(dtoPath)) return;

        const dtoContent = fs.readFileSync(dtoPath, 'utf-8');
        
        schema.properties.forEach(prop => {
            if (!prop.nullable) {
                const exists = dtoContent.includes(prop.name);
                if (!exists) {
                    console.error(`[Integrity Warning] API DTO ${dtoPath} lacks non-nullable field '${prop.name}' from model ${modelName}`);
                }
            }
        });
    }

    /**
     * Hilfsmethode zum Mapping von DB-Typen auf TS-Basistypen.
     */
    private mapDbTypeToTs(dbType: string): string {
        const mapping: Record<string, string> = {
            'varchar': 'string',
            'text': 'string',
            'int': 'number',
            'integer': 'number',
            'float': 'number',
            'boolean': 'boolean',
            'timestamp': 'Date',
            'jsonb': 'any'
        };
        return mapping[dbType.toLowerCase()] || 'any';
    }
}

/**
 * Singleton Instanz für den globalen Zugriff im Build-Prozess oder zur Laufzeit.
 */
export const integrityChecker = new IntegrityChecker();
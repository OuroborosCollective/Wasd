import { Project, InterfaceDeclaration } from 'ts-morph';
import * as path from 'path';

export class AstInterfaceSync {
    private project: Project;

    constructor() {
        this.project = new Project({
            compilerOptions: {
                allowJs: true,
                declaration: true,
            }
        });
    }

    /**
     * Synchronisiert ein TS-Interface mit einem Datenbankschema.
     * Nutzt AST (ts-morph) für deterministische Modifikationen.
     */
    public syncInterfaceWithSchema(interfacePath: string, schema: { tableName: string, properties: any[] }): void {
        const sourceFile = this.project.addSourceFileAtPath(interfacePath);
        // Suche nach dem Interface, das dem Tabellennamen entspricht (Case-Insensitive Match möglich)
        let interfaceDeclaration = sourceFile.getInterface(schema.tableName);
        
        if (!interfaceDeclaration) {
            // Fallback: Suche nach einem Interface, das ähnlich heißt oder erstelle es
            interfaceDeclaration = sourceFile.addInterface({
                name: schema.tableName,
                isExported: true
            });
        }

        const existingProperties = interfaceDeclaration.getProperties();
        const schemaPropNames = schema.properties.map(p => p.name);

        // 1. Bestehende Properties aktualisieren oder neue hinzufügen
        schema.properties.forEach((prop: any) => {
            const property = interfaceDeclaration!.getProperty(prop.name);
            const tsType = this.mapDbTypeToTs(prop.type);

            if (property) {
                property.setType(tsType);
                property.setHasQuestionToken(prop.nullable);
            } else {
                interfaceDeclaration!.addProperty({
                    name: prop.name,
                    type: tsType,
                    hasQuestionToken: prop.nullable,
                });
            }
        });

        // 2. Properties entfernen, die nicht mehr im Schema sind (Strict Sync)
        existingProperties.forEach(prop => {
            if (!schemaPropNames.includes(prop.getName())) {
                prop.remove();
            }
        });

        sourceFile.saveSync();
        console.log(`[AST Sync] Interface ${schema.tableName} in ${interfacePath} synchronisiert.`);
    }

    private mapDbTypeToTs(dbType: string): string {
        const mapping: Record<string, string> = {
            'varchar': 'string',
            'text': 'string',
            'char': 'string',
            'int': 'number',
            'integer': 'number',
            'bigint': 'number',
            'smallint': 'number',
            'decimal': 'number',
            'numeric': 'number',
            'real': 'number',
            'double precision': 'number',
            'boolean': 'boolean',
            'bool': 'boolean',
            'timestamp': 'Date',
            'timestamptz': 'Date',
            'date': 'Date',
            'json': 'any',
            'jsonb': 'any',
            'uuid': 'string'
        };
        const normalizedType = dbType.toLowerCase().split('(')[0].trim();
        return mapping[normalizedType] || 'any';
    }
}

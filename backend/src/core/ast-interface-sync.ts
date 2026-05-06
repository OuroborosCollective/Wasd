import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';

export class AstInterfaceSync {
    private project: Project;

    constructor() {
        this.project = new Project();
    }

    public syncInterfaceWithSchema(interfacePath: string, schema: any): void {
        const sourceFile = this.project.addSourceFileAtPath(interfacePath);
        const interfaceDeclaration = sourceFile.getInterface(schema.tableName);

        if (!interfaceDeclaration) {
            console.error(`Interface ${schema.tableName} not found in ${interfacePath}`);
            return;
        }

        schema.properties.forEach((prop: any) => {
            const property = interfaceDeclaration.getProperty(prop.name);
            const tsType = this.mapDbTypeToTs(prop.type);

            if (property) {
                property.setType(tsType);
                property.setHasQuestionToken(prop.nullable);
            } else {
                interfaceDeclaration.addProperty({
                    name: prop.name,
                    type: tsType,
                    hasQuestionToken: prop.nullable,
                });
            }
        });

        sourceFile.saveSync();
    }

    private mapDbTypeToTs(dbType: string): string {
        const mapping: Record<string, string> = {
            'varchar': 'string',
            'text': 'string',
            'int': 'number',
            'integer': 'number',
            'boolean': 'boolean',
            'timestamp': 'Date',
            'jsonb': 'any',
        };
        return mapping[dbType.toLowerCase()] || 'any';
    }
}

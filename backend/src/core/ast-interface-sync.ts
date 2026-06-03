import { Project, QuoteKind, SourceFile, InterfaceDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

export interface DbSchemaProperty {
    name: string;
    type: string;
    nullable?: boolean;
    comment?: string;
}

export interface DbSchema {
    tableName: string;
    interfaceName?: string;
    properties: DbSchemaProperty[];
}

export interface AstInterfaceSyncOptions {
    strict?: boolean;
    safeJson?: boolean;
    useBigInt?: boolean;
    format?: boolean;
    tickHz?: number;
    maxSyncBudgetMs?: number;
    failOnBudgetOverrun?: boolean;
    preserveSchemaOrder?: boolean;
}

export interface AstInterfaceSyncResult {
    interfaceName: string;
    tableName: string;
    interfacePath: string;
    added: string[];
    updated: string[];
    removed: string[];
    unchanged: string[];
    durationMs: number;
    tickHz: number;
    tickBudgetMs: number;
    maxSyncBudgetMs: number;
    budgetOverrun: boolean;
    deterministicHash: string;
}

type RequiredOptions = Required<AstInterfaceSyncOptions>;

/**
 * Deterministic DB-schema -> TypeScript interface synchronizer.
 * Built for the WASD watchdog and the 10Hz world-server rule:
 * schema sync must never silently consume a full simulation tick.
 */
export class AstInterfaceSync {
    private project: Project;
    private options: RequiredOptions;

    constructor(options: AstInterfaceSyncOptions = {}) {
        this.options = this.normalizeOptions(options);
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
            manipulationSettings: {
                quoteKind: QuoteKind.Single,
                useTrailingCommas: true,
            },
            compilerOptions: {
                allowJs: false,
                declaration: true,
                strict: true,
                esModuleInterop: true,
            },
        });
    }

    public syncInterfaceWithSchema(
        interfacePath: string,
        schema: DbSchema,
        options: AstInterfaceSyncOptions = {},
    ): AstInterfaceSyncResult {
        const startedAt = Date.now();
        const effective = this.normalizeOptions({ ...this.options, ...options });
        this.validateSchema(schema);

        const absolutePath = path.resolve(interfacePath);
        const sourceFile = this.getOrCreateSourceFile(absolutePath);
        const interfaceName = this.toSafeInterfaceName(schema.interfaceName || schema.tableName);

        let declaration = this.findInterfaceCaseInsensitive(sourceFile, interfaceName);
        if (!declaration) {
            declaration = sourceFile.addInterface({
                name: interfaceName,
                isExported: true,
            });
            declaration.replaceWithText(writer => {
                writer.writeLine('/**');
                writer.writeLine(` * Generated from database table "${schema.tableName}".`);
                writer.writeLine(' * Deterministic schema contract for server/client boundaries.');
                writer.writeLine(' */');
                writer.writeLine(`export interface ${interfaceName} {`);
                writer.writeLine('}');
            });
            declaration = sourceFile.getInterfaceOrThrow(interfaceName);
        }

        const result = this.applySchema(declaration, absolutePath, schema, interfaceName, effective, startedAt);

        if (effective.format) {
            sourceFile.formatText({ indentSize: 4 });
        }

        sourceFile.saveSync();
        this.assertBudget(result, effective);

        console.log(`[AST Sync] ${interfaceName} <= ${schema.tableName} | ${result.durationMs}ms | hash=${result.deterministicHash}`);
        return result;
    }

    public syncBatchWithinTickBudget(
        interfacesPath: string,
        schemas: Iterable<[string, DbSchema]>,
        options: AstInterfaceSyncOptions = {},
    ): AstInterfaceSyncResult[] {
        const effective = this.normalizeOptions({ ...this.options, ...options });
        const startedAt = Date.now();
        const results: AstInterfaceSyncResult[] = [];

        for (const [modelName, schema] of schemas) {
            if (Date.now() - startedAt >= effective.maxSyncBudgetMs) {
                console.warn(`[AST Sync] Tick budget reached before ${modelName}; deferred to next watchdog pass.`);
                break;
            }

            const interfacePath = path.join(interfacesPath, `${modelName}.ts`);
            if (fs.existsSync(interfacePath)) {
                results.push(this.syncInterfaceWithSchema(interfacePath, schema, effective));
            }
        }

        return results;
    }

    private applySchema(
        declaration: InterfaceDeclaration,
        interfacePath: string,
        schema: DbSchema,
        interfaceName: string,
        options: RequiredOptions,
        startedAt: number,
    ): AstInterfaceSyncResult {
        const added: string[] = [];
        const updated: string[] = [];
        const removed: string[] = [];
        const unchanged: string[] = [];
        const schemaNames = new Set(schema.properties.map(p => p.name));

        for (const prop of schema.properties) {
            const property = declaration.getProperty(prop.name);
            const tsType = this.mapDbTypeToTs(prop.type, options);
            const optional = Boolean(prop.nullable);

            if (property) {
                const before = `${property.getName()}${property.hasQuestionToken() ? '?' : ''}:${property.getTypeNode()?.getText() || 'unknown'}`;
                property.setType(tsType);
                property.setHasQuestionToken(optional);
                const after = `${property.getName()}${property.hasQuestionToken() ? '?' : ''}:${property.getTypeNode()?.getText() || 'unknown'}`;
                if (before === after) unchanged.push(prop.name);
                else updated.push(prop.name);
            } else {
                declaration.addProperty({
                    name: prop.name,
                    type: tsType,
                    hasQuestionToken: optional,
                    docs: prop.comment ? [{ description: this.escapeComment(prop.comment) }] : undefined,
                });
                added.push(prop.name);
            }
        }

        if (options.strict) {
            for (const property of declaration.getProperties()) {
                const name = property.getName();
                if (!schemaNames.has(name)) {
                    property.remove();
                    removed.push(name);
                }
            }
        }

        if (options.preserveSchemaOrder) {
            const structures = schema.properties
                .map(p => declaration.getProperty(p.name))
                .filter((p): p is NonNullable<typeof p> => Boolean(p))
                .map(p => p.getStructure());
            declaration.getProperties().forEach(p => p.remove());
            declaration.addProperties(structures);
        }

        const durationMs = Date.now() - startedAt;
        const tickBudgetMs = Math.floor(1000 / options.tickHz);
        const deterministicHash = this.stableHash({
            interfaceName,
            tableName: schema.tableName,
            properties: schema.properties.map(p => ({
                name: p.name,
                type: this.mapDbTypeToTs(p.type, options),
                nullable: Boolean(p.nullable),
            })),
        });

        return {
            interfaceName,
            tableName: schema.tableName,
            interfacePath,
            added,
            updated,
            removed,
            unchanged,
            durationMs,
            tickHz: options.tickHz,
            tickBudgetMs,
            maxSyncBudgetMs: options.maxSyncBudgetMs,
            budgetOverrun: durationMs > options.maxSyncBudgetMs,
            deterministicHash,
        };
    }

    private getOrCreateSourceFile(absolutePath: string): SourceFile {
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(absolutePath)) {
            return this.project.getSourceFile(absolutePath) || this.project.addSourceFileAtPath(absolutePath);
        }
        return this.project.createSourceFile(absolutePath, '/* eslint-disable */\n', { overwrite: false });
    }

    private findInterfaceCaseInsensitive(sourceFile: SourceFile, interfaceName: string): InterfaceDeclaration | undefined {
        const needle = interfaceName.toLowerCase();
        return sourceFile.getInterfaces().find(i => i.getName().toLowerCase() === needle);
    }

    private validateSchema(schema: DbSchema): void {
        if (!schema || typeof schema.tableName !== 'string' || !Array.isArray(schema.properties)) {
            throw new Error('[AST Sync] Invalid schema object.');
        }
        const seen = new Set<string>();
        for (const prop of schema.properties) {
            if (!prop.name || !prop.type) throw new Error(`[AST Sync] Invalid property in ${schema.tableName}.`);
            if (seen.has(prop.name)) throw new Error(`[AST Sync] Duplicate property ${prop.name} in ${schema.tableName}.`);
            seen.add(prop.name);
        }
    }

    private toSafeInterfaceName(input: string): string {
        const cleaned = input.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        const pascal = cleaned.split('_').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const safeName = pascal || 'GeneratedInterface';
        return /^[0-9]/.test(safeName) ? `I${safeName}` : safeName;
    }

    private mapDbTypeToTs(dbType: string, options: RequiredOptions): string {
        const normalized = dbType.toLowerCase().replace(/\s+/g, ' ').split('(')[0].trim();
        const isArray = normalized.endsWith('[]');
        const base = isArray ? normalized.slice(0, -2) : normalized;
        const jsonType = options.safeJson ? 'unknown' : 'any';
        const bigIntType = options.useBigInt ? 'bigint' : 'number';
        const mapping: Record<string, string> = {
            varchar: 'string', text: 'string', char: 'string', character: 'string', 'character varying': 'string', uuid: 'string', inet: 'string', cidr: 'string', macaddr: 'string',
            int: 'number', int2: 'number', int4: 'number', integer: 'number', smallint: 'number', serial: 'number', smallserial: 'number',
            bigint: bigIntType, int8: bigIntType, bigserial: bigIntType,
            decimal: 'number', numeric: 'number', real: 'number', float: 'number', float4: 'number', float8: 'number', double: 'number', 'double precision': 'number',
            boolean: 'boolean', bool: 'boolean',
            timestamp: 'Date', timestamptz: 'Date', 'timestamp without time zone': 'Date', 'timestamp with time zone': 'Date', date: 'Date', time: 'string', timetz: 'string',
            json: jsonType, jsonb: jsonType, bytea: 'Uint8Array',
        };
        const mapped = mapping[base] || 'unknown';
        return isArray ? `${mapped}[]` : mapped;
    }

    private normalizeOptions(options: AstInterfaceSyncOptions): RequiredOptions {
        const tickHz = Math.max(1, Math.floor(options.tickHz ?? 10));
        const tickBudgetMs = Math.floor(1000 / tickHz);
        return {
            strict: options.strict ?? false,
            safeJson: options.safeJson ?? true,
            useBigInt: options.useBigInt ?? true,
            format: options.format ?? true,
            tickHz,
            maxSyncBudgetMs: Math.max(1, Math.floor(options.maxSyncBudgetMs ?? tickBudgetMs / 2)),
            failOnBudgetOverrun: options.failOnBudgetOverrun ?? false,
            preserveSchemaOrder: options.preserveSchemaOrder ?? true,
        };
    }

    private assertBudget(result: AstInterfaceSyncResult, options: RequiredOptions): void {
        if (!result.budgetOverrun) return;
        const message = `[AST Sync] Budget overrun: ${result.durationMs}ms > ${result.maxSyncBudgetMs}ms at ${result.tickHz}Hz.`;
        if (options.failOnBudgetOverrun) throw new Error(message);
        console.warn(message);
    }

    private stableHash(value: unknown): string {
        const input = this.stableStringify(value);
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    private stableStringify(value: unknown): string {
        if (value === null || typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(v => this.stableStringify(v)).join(',')}]`;
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(k => `${JSON.stringify(k)}:${this.stableStringify(record[k])}`).join(',')}}`;
    }

    private escapeComment(comment: string): string {
        return comment.replace(/\*\//g, '* /');
    }
}

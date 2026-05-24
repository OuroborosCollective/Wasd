import { Project } from 'ts-morph';
import * as path from 'path';

export interface DependencyNode {
    path: string;
    dependencies: Set<string>;
    dependents: Set<string>;
}

export class DependencyTracker {
    private project: Project;
    private nodes: Map<string, DependencyNode> = new Map();

    constructor(tsConfigFilePath?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigFilePath,
            skipAddingFilesFromTsConfig: !tsConfigFilePath
        });
    }

    public addFiles(filePaths: string[]): void {
        for (const filePath of filePaths) {
            this.project.addSourceFileAtPath(filePath);
        }
        this.analyze();
    }

    public analyze(): void {
        this.nodes.clear();
        const sourceFiles = this.project.getSourceFiles();

        for (const sourceFile of sourceFiles) {
            const filePath = path.resolve(sourceFile.getFilePath());
            this.ensureNode(filePath);
        }

        for (const sourceFile of sourceFiles) {
            const filePath = path.resolve(sourceFile.getFilePath());
            const imports = sourceFile.getImportDeclarations();

            for (const imp of imports) {
                const importedSourceFile = imp.getModuleSpecifierSourceFile();
                if (importedSourceFile) {
                    const importedPath = path.resolve(importedSourceFile.getFilePath());
                    this.registerDependency(filePath, importedPath);
                }
            }

            const exports = sourceFile.getExportDeclarations();
            for (const exp of exports) {
                const exportedSourceFile = exp.getModuleSpecifierSourceFile();
                if (exportedSourceFile) {
                    const exportedPath = path.resolve(exportedSourceFile.getFilePath());
                    this.registerDependency(filePath, exportedPath);
                }
            }
        }
    }

    private ensureNode(filePath: string): DependencyNode {
        let node = this.nodes.get(filePath);
        if (!node) {
            node = {
                path: filePath,
                dependencies: new Set(),
                dependents: new Set()
            };
            this.nodes.set(filePath, node);
        }
        return node;
    }

    private registerDependency(subscriber: string, provider: string): void {
        const subscriberNode = this.ensureNode(subscriber);
        const providerNode = this.ensureNode(provider);

        subscriberNode.dependencies.add(provider);
        providerNode.dependents.add(subscriber);
    }

    public getAffectedDownstream(modifiedFiles: string[]): string[] {
        const affected = new Set<string>();
        const queue: string[] = [];

        for (const file of modifiedFiles) {
            const resolvedPath = path.resolve(file);
            queue.push(resolvedPath);
        }

        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentPath = queue.shift()!;
            if (visited.has(currentPath)) continue;
            visited.add(currentPath);

            const node = this.nodes.get(currentPath);
            if (node) {
                for (const dependent of node.dependents) {
                    if (!visited.has(dependent)) {
                        affected.add(dependent);
                        queue.push(dependent);
                    }
                }
            }
        }

        return Array.from(affected);
    }

    public getDependencyGraph(): Map<string, string[]> {
        const graph = new Map<string, string[]>();
        for (const [path, node] of this.nodes) {
            graph.set(path, Array.from(node.dependencies));
        }
        return graph;
    }

    public getReverseDependencyGraph(): Map<string, string[]> {
        const graph = new Map<string, string[]>();
        for (const [path, node] of this.nodes) {
            graph.set(path, Array.from(node.dependents));
        }
        return graph;
    }
}
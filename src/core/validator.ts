import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

export interface ValidationError {
    type: 'reference' | 'include' | 'path' | 'workspace';
    message: string;
    target: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export class ProjectValidator {
    public async validate(config: any, projectPath: string): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const baseDir = path.dirname(projectPath);

        if (config.references) {
            for (const ref of config.references) {
                const refPath = path.resolve(baseDir, ref.path);
                if (!this.checkCaseSensitiveExists(refPath)) {
                    errors.push({
                        type: 'reference',
                        message: `Referenced directory does not exist or case mismatch: ${ref.path}`,
                        target: ref.path
                    });
                } else {
                    const tsConfigPath = path.join(refPath, 'tsconfig.json');
                    if (!this.checkCaseSensitiveExists(tsConfigPath)) {
                        errors.push({
                            type: 'reference',
                            message: `tsconfig.json missing in referenced directory: ${ref.path}`,
                            target: ref.path
                        });
                    }
                }
            }
            await this.validatePnpmWorkspace(baseDir, config.references, errors);
        }

        if (config.include) {
            for (const pattern of config.include) {
                const files = fg.sync(pattern, { cwd: baseDir, absolute: true });
                if (files.length === 0) {
                    errors.push({
                        type: 'include',
                        message: `Include glob matched no files: ${pattern}`,
                        target: pattern
                    });
                }
            }
        }

        if (config.compilerOptions?.paths) {
            for (const [key, patterns] of Object.entries(config.compilerOptions.paths)) {
                for (const pattern of (patterns as string[])) {
                    const cleanPattern = pattern.replace(/\/\*$/, '');
                    const fullPath = path.resolve(baseDir, cleanPattern);
                    
                    if (!fs.existsSync(fullPath)) {
                        errors.push({
                            type: 'path',
                            message: `Path mapping target does not exist: ${pattern}`,
                            target: key
                        });
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private checkCaseSensitiveExists(filePath: string): boolean {
        if (!fs.existsSync(filePath)) return false;

        const dir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const files = fs.readdirSync(dir);

        return files.includes(fileName);
    }

    private async validatePnpmWorkspace(baseDir: string, references: any[], errors: ValidationError[]): Promise<void> {
        let currentDir = baseDir;
        let workspaceFile: string | null = null;

        while (currentDir !== path.parse(currentDir).root) {
            const potentialFile = path.join(currentDir, 'pnpm-workspace.yaml');
            if (fs.existsSync(potentialFile)) {
                workspaceFile = potentialFile;
                break;
            }
            currentDir = path.dirname(currentDir);
        }

        if (!workspaceFile) return;

        try {
            const content = fs.readFileSync(workspaceFile, 'utf-8');
            const packageJsonPath = path.join(baseDir, 'package.json');
            
            if (fs.existsSync(packageJsonPath)) {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                if (pkg.dependencies || pkg.devDependencies) {
                    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
                    for (const ref of references) {
                        const refPkgPath = path.join(path.resolve(baseDir, ref.path), 'package.json');
                        if (fs.existsSync(refPkgPath)) {
                            const refPkg = JSON.parse(fs.readFileSync(refPkgPath, 'utf-8'));
                            if (allDeps[refPkg.name] && !content.includes(ref.path.replace(/^\.\//, ''))) {
                                errors.push({
                                    type: 'workspace',
                                    message: `Referenced package ${refPkg.name} is a dependency but might not be correctly mapped in pnpm-workspace.yaml`,
                                    target: ref.path
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Workspace check is best-effort
        }
    }
}
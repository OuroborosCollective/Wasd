import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface representing a validation issue for reporting.
 */
interface ValidationIssue {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
}

/**
 * Core Validator class for handling TSConfig validation logic.
 */
class TSConfigValidator {
    /**
     * Entry point for the validation process.
     * @param targetPath The starting file or directory path.
     */
    public async run(targetPath: string): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];
        const absolutePath = path.resolve(targetPath);

        if (!fs.existsSync(absolutePath)) {
            issues.push({
                file: targetPath,
                line: 0,
                column: 0,
                message: `The specified path does not exist: ${absolutePath}`,
                severity: 'error'
            });
            return issues;
        }

        await this.scanRecursive(absolutePath, issues);
        return issues;
    }

    /**
     * Recursively scans directories for tsconfig.json files or validates a single file.
     */
    private async scanRecursive(currentPath: string, issues: ValidationIssue[]): Promise<void> {
        const stats = fs.statSync(currentPath);

        if (stats.isDirectory()) {
            const entries = fs.readdirSync(currentPath);

            // Handle direct tsconfig in the folder
            if (entries.includes('tsconfig.json')) {
                await this.validateFile(path.join(currentPath, 'tsconfig.json'), issues);
            }

            // Recurse into subdirectories (ignoring common noise)
            for (const entry of entries) {
                if (entry === 'node_modules' || entry.startsWith('.')) continue;
                
                const fullPath = path.join(currentPath, entry);
                if (fs.statSync(fullPath).isDirectory()) {
                    await this.scanRecursive(fullPath, issues);
                }
            }
        } else if (currentPath.endsWith('tsconfig.json')) {
            await this.validateFile(currentPath, issues);
        }
    }

    /**
     * Performs actual validation logic on a specific tsconfig.json file.
     */
    private async validateFile(filePath: string, issues: ValidationIssue[]): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (!content.trim()) {
                issues.push({
                    file: filePath,
                    line: 1,
                    column: 1,
                    message: 'tsconfig.json is empty.',
                    severity: 'error'
                });
                return;
            }

            // Simple JSON validation
            JSON.parse(content);
            
            // Logic for specific TSConfig rules can be added here
            // Example: check for "compilerOptions"
        } catch (error: any) {
            issues.push({
                file: filePath,
                line: 1,
                column: 1,
                message: `JSON Parse Error: ${error.message}`,
                severity: 'error'
            });
        }
    }
}

/**
 * Main entry point function for the CLI.
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const inputPath = args[0] || '.';
    
    const validator = new TSConfigValidator();
    
    try {
        const issues = await validator.run(inputPath);

        if (issues.length > 0) {
            issues.forEach(issue => {
                // GitHub Actions Workflow Command format (Problem Matcher)
                const githubMessage = `::${issue.severity} file=${issue.file},line=${issue.line},col=${issue.column}::${issue.message}`;
                process.stdout.write(`${githubMessage}\n`);
                
                // Standard human-readable output
                const standardMessage = `${issue.file}:${issue.line}:${issue.column} - ${issue.severity.toUpperCase()}: ${issue.message}`;
                process.stdout.write(`${standardMessage}\n`);
            });

            process.exit(1);
        } else {
            process.stdout.write('Validation successful: No issues found.\n');
            process.exit(0);
        }
    } catch (err: any) {
        process.stderr.write(`Unexpected fatal error: ${err.message}\n`);
        process.exit(1);
    }
}

// Start execution
main();
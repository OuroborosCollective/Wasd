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
        let stats: fs.Stats;
        try {
            stats = fs.statSync(currentPath);
        } catch (err: any) {
            issues.push({
                file: currentPath,
                line: 0,
                column: 0,
                message: `Failed to access path: ${err.message}`,
                severity: 'error'
            });
            return;
        }

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
                try {
                    if (fs.statSync(fullPath).isDirectory()) {
                        await this.scanRecursive(fullPath, issues);
                    }
                } catch (e) {
                    // Ignore individual file access errors during recursion
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

            const config = JSON.parse(content);
            
            if (!config.compilerOptions) {
                issues.push({
                    file: filePath,
                    line: 1,
                    column: 1,
                    message: 'Missing "compilerOptions" in tsconfig.json.',
                    severity: 'warning'
                });
            }
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
    try {
        // Initialization Phase
        const args = process.argv.slice(2);
        const inputPath = args[0] || '.';
        
        process.stdout.write(`Initializing validation for path: ${path.resolve(inputPath)}\n`);

        const validator = new TSConfigValidator();
        
        // Execution Phase
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
        // Initialization/Fatal Error Handling
        process.stderr.write(`FATAL ERROR during initialization or execution:\n`);
        process.stderr.write(`Name: ${err.name || 'Error'}\n`);
        process.stderr.write(`Message: ${err.message || 'Unknown error'}\n`);
        if (err.stack) {
            process.stderr.write(`Stack Trace:\n${err.stack}\n`);
        }
        process.exit(1);
    }
}

// Start execution
main();
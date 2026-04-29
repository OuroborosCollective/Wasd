import chalk from 'chalk';

interface CompilerError {
    filePath: string;
    message: string;
    offset: number;
    length?: number;
}

interface Location {
    line: number;
    column: number;
}

export class Reporter {
    private sourceCache: Map<string, string> = new Map();

    constructor(sources: Record<string, string>) {
        for (const [path, content] of Object.entries(sources)) {
            this.sourceCache.set(path, content);
        }
    }

    private getLineAndColumn(source: string, offset: number): Location {
        const lines = source.substring(0, offset).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return { line, column };
    }

    public report(errors: CompilerError[]): string {
        if (errors.length === 0) {
            return chalk.green('No errors found.');
        }

        const grouped = this.groupByFile(errors);
        let output = '';

        for (const [filePath, fileErrors] of Object.entries(grouped)) {
            output += `${chalk.underline(filePath)}\n`;
            
            const source = this.sourceCache.get(filePath) || '';
            
            fileErrors.forEach(err => {
                const { line, column } = this.getLineAndColumn(source, err.offset);
                const prefix = chalk.red('error');
                const pos = chalk.gray(`:${line}:${column}`);
                
                output += `  ${prefix}${pos} - ${err.message}\n`;
                
                if (source) {
                    output += this.renderSnippet(source, line, column, err.length || 1);
                }
            });
            output += '\n';
        }

        const total = errors.length;
        output += chalk.bold.red(`\nFound ${total} error${total === 1 ? '' : 's'}.\n`);

        return output;
    }

    private groupByFile(errors: CompilerError[]): Record<string, CompilerError[]> {
        return errors.reduce((acc, err) => {
            if (!acc[err.filePath]) {
                acc[err.filePath] = [];
            }
            acc[err.filePath].push(err);
            return acc;
        }, {} as Record<string, CompilerError[]>);
    }

    private renderSnippet(source: string, line: number, column: number, length: number): string {
        const lines = source.split('\n');
        const errorLine = lines[line - 1];
        if (!errorLine) return '';

        const gutter = ` ${line} | `;
        const padding = ' '.repeat(gutter.length + column - 1);
        const underline = chalk.red('~'.repeat(Math.max(1, length)));

        return `${chalk.gray(gutter)}${errorLine}\n${padding}${underline}\n`;
    }
}
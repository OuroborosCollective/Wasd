import * as fs from 'fs';
import * as path from 'path';

const SRC_DIRECTORY = path.resolve(__dirname, '..');

function walkDirectory(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDirectory(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    });
    return results;
}

function fixImportPath(importPath: string): string {
    let fixedPath = importPath;

    if (fixedPath.endsWith('.ts')) {
        fixedPath = fixedPath.slice(0, -3);
    }

    const weatherRegex = /(\/|^|\.\.\/|\.\/)weather($|\/)/g;
    fixedPath = fixedPath.replace(weatherRegex, (match, p1, p2) => {
        return `${p1}Weather${p2}`;
    });

    return fixedPath;
}

function processFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    const fromRegex = /((?:import|export)\s+[\s\S]*?from\s+['"])(.*?)(['"])/g;
    const sideEffectRegex = /(import\s+['"])(.*?)(['"])/g;

    let updatedContent = content.replace(fromRegex, (match, prefix, importPath, suffix) => {
        const fixed = fixImportPath(importPath);
        if (fixed !== importPath) {
            hasChanges = true;
            return `${prefix}${fixed}${suffix}`;
        }
        return match;
    });

    updatedContent = updatedContent.replace(sideEffectRegex, (match, prefix, importPath, suffix) => {
        if (prefix.includes('from')) return match;
        const fixed = fixImportPath(importPath);
        if (fixed !== importPath) {
            hasChanges = true;
            return `${prefix}${fixed}${suffix}`;
        }
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
}

function run(): void {
    const files = walkDirectory(SRC_DIRECTORY);
    files.forEach((file) => {
        processFile(file);
    });
}

run();
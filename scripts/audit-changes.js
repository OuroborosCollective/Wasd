const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const START_DATE = '2024-04-28';
const END_DATE = '2024-04-30';

function getChangedFiles() {
    try {
        const output = execSync(`git log --since="${START_DATE}" --until="${END_DATE}" --name-only --pretty=format:`, { encoding: 'utf-8' });
        return [...new Set(output.split('\n').filter(file => file.trim() !== '' && fs.existsSync(file)))];
    } catch (error) {
        console.error('Fehler beim Abrufen der Git-Logs:', error.message);
        return [];
    }
}

function analyzeFile(filePath, report) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileIssues = [];

    const arrayRegex = /(const|let|var)\s+(\w+)\s*=\s*\[\]/g;
    let match;
    while ((match = arrayRegex.exec(content)) !== null) {
        fileIssues.push(`Array-Initialisierung ohne expliziten Typ: "${match[0]}"`);
    }

    const varNameRegex = /(const|let|var)\s+([A-Z][a-zA-Z0-9_]*)\s*=/g;
    while ((match = varNameRegex.exec(content)) !== null) {
        fileIssues.push(`Variable nutzt PascalCase (camelCase erwartet): "${match[2]}"`);
    }

    const typeNameRegex = /(class|interface|type)\s+([a-z][a-zA-Z0-9_]*)/g;
    while ((match = typeNameRegex.exec(content)) !== null) {
        fileIssues.push(`Typ/Klasse nutzt camelCase (PascalCase erwartet): "${match[2]}"`);
    }

    const hasDefaultExport = /export\s+default/.test(content);
    const hasNamedExport = /export\s+(const|let|var|function|class|type|interface|enum)/.test(content) && !/export\s+default/.test(content);
    
    const namedMatches = content.match(/export\s+(const|let|var|function|class|type|interface|enum)\s+(\w+)/g);
    if (hasDefaultExport && namedMatches && namedMatches.length > 0) {
        fileIssues.push(`Mischung aus Default- und Named-Exports gefunden.`);
    }

    if (fileIssues.length > 0) {
        report[filePath] = fileIssues;
    }
}

function getImports(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = [];
    const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
    let match;
    const dir = path.dirname(filePath);

    while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];
        if (importPath.startsWith('.')) {
            let fullPath = path.resolve(dir, importPath);
            if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.js')) {
                if (fs.existsSync(fullPath + '.ts')) fullPath += '.ts';
                else if (fs.existsSync(fullPath + '.js')) fullPath += '.js';
                else if (fs.existsSync(path.join(fullPath, 'index.ts'))) fullPath = path.join(fullPath, 'index.ts');
                else if (fs.existsSync(path.join(fullPath, 'index.js'))) fullPath = path.join(fullPath, 'index.js');
            }
            if (fs.existsSync(fullPath)) {
                imports.push(fullPath);
            }
        }
    }
    return imports;
}

function checkCircularDependencies(file, visited = new Set(), stack = new Set(), circularPaths = []) {
    visited.add(file);
    stack.add(file);

    const imports = getImports(file);
    for (const imp of imports) {
        if (stack.has(imp)) {
            circularPaths.push(`${file} -> ${imp}`);
        } else if (!visited.has(imp)) {
            checkCircularDependencies(imp, visited, stack, circularPaths);
        }
    }

    stack.delete(file);
    return circularPaths;
}

function runAudit() {
    console.log(`Starte Audit für den Zeitraum ${START_DATE} bis ${END_DATE}...\n`);
    const files = getChangedFiles();
    const report = {};
    const circularReport = [];

    files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
            analyzeFile(file, report);
            const circulars = checkCircularDependencies(path.resolve(file));
            if (circulars.length > 0) {
                circularReport.push({ file, circulars });
            }
        }
    });

    if (Object.keys(report).length === 0 && circularReport.length === 0) {
        console.log('Keine Inkonsistenzen gefunden.');
        return;
    }

    console.log('--- AUDIT REPORT ---\n');
    for (const [file, issues] of Object.entries(report)) {
        console.log(`Datei: ${file}`);
        issues.forEach(issue => console.log(`  - [!] ${issue}`));
        console.log('');
    }

    if (circularReport.length > 0) {
        console.log('--- ZIRKULÄRE ABHÄNGIGKEITEN ---');
        circularReport.forEach(item => {
            console.log(`Datei: ${item.file}`);
            item.circulars.forEach(c => console.log(`  - [REKURSION] ${c}`));
        });
    }
}

runAudit();
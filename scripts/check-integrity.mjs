import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import YAML from 'yaml';

const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const LOCKFILE_PATH = path.resolve(process.cwd(), 'pnpm-lock.yaml');

function getMismatches() {
    if (!fs.existsSync(PACKAGE_JSON_PATH) || !fs.existsSync(LOCKFILE_PATH)) {
        console.error('Required files (package.json or pnpm-lock.yaml) not found.');
        process.exit(1);
    }

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const lockContent = fs.readFileSync(LOCKFILE_PATH, 'utf-8');
    const lock = YAML.parse(lockContent);

    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    const mismatches = [];

    const lockImporters = lock.importers?.['.'] || {};
    const lockSpecifiers = lockImporters.specifiers || lock.specifiers || {};

    for (const [name, version] of Object.entries(dependencies)) {
        const lockVersion = lockSpecifiers[name];

        if (!lockVersion) {
            mismatches.push({
                package: name,
                expected: version,
                found: 'MISSING',
                type: pkg.dependencies?.[name] ? 'dependency' : 'devDependency'
            });
        } else if (lockVersion !== version) {
            mismatches.push({
                package: name,
                expected: version,
                found: lockVersion,
                type: pkg.dependencies?.[name] ? 'dependency' : 'devDependency'
            });
        }
    }

    return mismatches;
}

function printTable(mismatches) {
    const head = ['Package', 'Expected (package.json)', 'Found (pnpm-lock.yaml)', 'Type'];
    const colWidths = [30, 25, 25, 15];

    const formatRow = (cols) => cols.map((c, i) => String(c).padEnd(colWidths[i])).join(' | ');

    console.log('\nIntegrity Check Failed: Mismatches found between package.json and pnpm-lock.yaml\n');
    console.log(formatRow(head));
    console.log('-'.repeat(colWidths.reduce((a, b) => a + b, 0) + 9));

    mismatches.forEach(m => {
        console.log(formatRow([m.package, m.expected, m.found, m.type]));
    });
    console.log('\n');
}

function main() {
    const isFix = process.argv.includes('--fix');
    const isCI = process.env.CI === 'true' || process.env.CI === '1';
    const mismatches = getMismatches();

    if (mismatches.length === 0) {
        console.log('Integrity check passed: package.json and pnpm-lock.yaml are in sync.');
        process.exit(0);
    }

    if (isFix) {
        console.log('Discrepancies found. Running fix: pnpm install --lockfile-only...');
        try {
            execSync('pnpm install --lockfile-only', { stdio: 'inherit' });
            console.log('Integrity restored.');
            process.exit(0);
        } catch (error) {
            console.error('Failed to fix integrity automatically.');
            process.exit(1);
        }
    } else {
        printTable(mismatches);
        console.log('Run with --fix to automatically synchronize the lockfile.');
        
        if (isCI) {
            process.exit(1);
        }
    }
}

main();
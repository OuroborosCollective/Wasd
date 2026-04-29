const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');

try {
    if (!fs.existsSync(packageJsonPath)) {
        console.error('\x1b[31mFEHLER: package.json nicht gefunden.\x1b[0m');
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageManager = packageJson.packageManager;

    if (!packageManager) {
        console.warn('Kein packageManager in package.json definiert.');
    } else {
        console.log(`Gefundener Package Manager: ${packageManager}`);
    }

    console.log('Führe pnpm prune aus...');
    execSync('pnpm prune', { stdio: 'inherit' });

    console.log('Aktualisiere Lockfile (lockfile-only)...');
    execSync('pnpm install --lockfile-only', { stdio: 'inherit' });

    try {
        execSync('git diff --exit-code pnpm-lock.yaml', { stdio: 'ignore' });
        console.log('Lockfile ist konsistent.');
    } catch (gitError) {
        console.error('\x1b[31mFEHLER: Synchronität verletzt! Bitte führen Sie lokal "pnpm install" aus und committen Sie die geänderte pnpm-lock.yaml.\x1b[0m');
        process.exit(1);
    }
} catch (error) {
    console.error(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}`);
    process.exit(1);
}
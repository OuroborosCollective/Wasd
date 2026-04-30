const fs = require('fs');
const path = require('path');

/**
 * Überprüft die Integrität zwischen package.json und package-lock.json.
 * Stellt sicher, dass alle definierten Abhängigkeiten im Lockfile vorhanden sind
 * und die installierten Versionen den Anforderungen entsprechen.
 */
function runIntegrityCheck() {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageLockPath = path.resolve(process.cwd(), 'package-lock.json');

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(packageLockPath)) {
        console.error('Fehler: package.json oder package-lock.json nicht gefunden.');
        process.exit(1);
    }

    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));

        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        const allDeps = { ...dependencies, ...devDependencies };

        const lockPackages = packageLock.packages || {};
        const lockDeps = packageLock.dependencies || {};

        let hasError = false;
        const missingDeps = [];
        const versionMismatches = [];

        for (const [name, versionRange] of Object.entries(allDeps)) {
            // NPM v7+ verwendet "packages", v6 verwendet "dependencies"
            const lockEntry = lockPackages[`node_modules/${name}`] || lockDeps[name];

            if (!lockEntry) {
                missingDeps.push(name);
                hasError = true;
                continue;
            }

            const installedVersion = lockEntry.version;

            // Einfacher Vergleichsalgorithmus für die Integrität
            // Wenn die Version im package.json eine exakte Version ist (kein ^, ~, >), muss sie exakt übereinstimmen
            const isExactVersion = /^[0-9]/.test(versionRange) && !versionRange.includes('^') && !versionRange.includes('~') && !versionRange.includes('*');
            
            if (isExactVersion && versionRange !== installedVersion) {
                versionMismatches.push(`${name} (Erwartet: ${versionRange}, Gefunden: ${installedVersion})`);
                hasError = true;
            }

            // Validierung, dass überhaupt eine Version vorhanden ist
            if (!installedVersion) {
                versionMismatches.push(`${name} (Keine Version im Lockfile gefunden)`);
                hasError = true;
            }
        }

        if (hasError) {
            console.error('--- INTEGRITY CHECK FAILED ---');
            if (missingDeps.length > 0) {
                console.error('Fehlende Abhängigkeiten im Lockfile:', missingDeps.join(', '));
            }
            if (versionMismatches.length > 0) {
                console.error('Versionskonflikte gefunden:', versionMismatches.join('; '));
            }
            console.error('Bitte führen Sie "npm install" aus, um die Integrität wiederherzustellen.');
            process.exit(1);
        }

        console.log('Integrity check erfolgreich: Alle Abhängigkeiten sind konsistent.');
        process.exit(0);

    } catch (error) {
        console.error('Fehler beim Analysieren der JSON Dateien:', error.message);
        process.exit(1);
    }
}

runIntegrityCheck();
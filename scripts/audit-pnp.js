const fs = require('fs');
const path = require('path');

/**
 * Audit-Skript für Monorepos.
 * Analysiert Yarn PnP oder pnpm-Lockfiles auf Duplikate.
 */

function auditPnP() {
    const pnpPath = path.resolve(process.cwd(), '.pnp.cjs');
    if (!fs.existsSync(pnpPath)) return null;

    try {
        const pnp = require(pnpPath);
        const packageMap = new Map();

        if (typeof pnp.getAllPackages !== 'function') {
            return null;
        }

        for (const pkg of pnp.getAllPackages().values()) {
            // Ignoriere Workspaces selbst
            if (!pkg.name || pkg.reference.startsWith('workspace:')) continue;
            
            if (!packageMap.has(pkg.name)) {
                packageMap.set(pkg.name, new Set());
            }
            // In PnP ist reference oft die Version oder ein Hash
            packageMap.get(pkg.name).add(pkg.reference);
        }
        return packageMap;
    } catch (e) {
        return null;
    }
}

function auditPnpm() {
    const lockPath = path.resolve(process.cwd(), 'pnpm-lock.yaml');
    if (!fs.existsSync(lockPath)) return null;

    const content = fs.readFileSync(lockPath, 'utf8');
    const packageMap = new Map();
    
    const lines = content.split('\n');
    let inPackages = false;

    for (const line of lines) {
        if (line.startsWith('packages:')) {
            inPackages = true;
            continue;
        }
        if (inPackages && line.trim() === '') continue;
        if (inPackages && line.length > 0 && !line.startsWith('  ')) break;

        if (inPackages) {
            // Regex für pnpm lockfile v5/v6/v9 Formate
            // Erkennt: /name@version oder "name@version"
            const match = line.match(/^\s+['"]?(\/?(@[^\/]+\/[^@\/]+|[^@\/]+))@([^\s'":]+)['"]?:/);
            if (match) {
                let name = match[1];
                if (name.startsWith('/')) name = name.substring(1);
                const version = match[3];

                if (!packageMap.has(name)) {
                    packageMap.set(name, new Set());
                }
                packageMap.get(name).add(version);
            }
        }
    }
    return packageMap;
}

function runAudit() {
    console.log('Starte Dependency Audit...');
    
    let packageMap = auditPnP();
    let type = 'Yarn PnP';

    if (!packageMap) {
        packageMap = auditPnpm();
        type = 'pnpm';
    }

    if (!packageMap) {
        console.error('Fehler: Weder .pnp.cjs noch pnpm-lock.yaml gefunden.');
        process.exit(1);
    }

    const duplicates = [];
    for (const [name, versions] of packageMap.entries()) {
        if (versions.size > 1) {
            duplicates.push({
                name,
                versions: Array.from(versions)
            });
        }
    }

    if (duplicates.length > 0) {
        console.error(`\x1b[31mAudit fehlgeschlagen: Inkompatible Duplikate in ${type} gefunden!\x1b[0m`);
        duplicates.forEach(pkg => {
            console.error(` - Paket "${pkg.name}" ist mit ${pkg.versions.length} Versionen vorhanden: ${pkg.versions.join(', ')}`);
        });
        console.error('\nBitte löse die Versionskonflikte im Monorepo auf.');
        process.exit(1);
    }

    console.log(`\x1b[32mAudit erfolgreich: Keine Duplikate in ${type} gefunden.\x1b[0m`);
    process.exit(0);
}

runAudit();
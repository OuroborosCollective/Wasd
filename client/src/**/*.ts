const fs = require('fs');
const path = require('path');

/**
 * Wandelt Import-Pfade in TypeScript-Dateien von 'shared' zu '@wasd/shared' um.
 * Berücksichtigt Deep-Imports und sowohl einfache als auch doppelte Anführungszeichen.
 */
function migrateSharedImports(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            migrateSharedImports(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const originalContent = fs.readFileSync(fullPath, 'utf8');
            
            // Regex Erklärung:
            // from\s+          -> Sucht nach 'from' gefolgt von Whitespace
            // (['"])           -> Capture Group 1: Matcht öffnendes ' oder "
            // shared           -> Matcht den exakten String 'shared'
            // (\/.*)?          -> Capture Group 2: Matcht optionalen Pfad-Suffix (z.B. /utils)
            // \1               -> Referenz auf Capture Group 1: Matcht schließendes Anführungszeichen
            const updatedContent = originalContent.replace(
                /from\s+(['"])shared(\/.*)?\1/g,
                (match, quote, suffix) => {
                    const pathSuffix = suffix || '';
                    return `from ${quote}@wasd/shared${pathSuffix}${quote}`;
                }
            );

            if (originalContent !== updatedContent) {
                fs.writeFileSync(fullPath, updatedContent, 'utf8');
            }
        }
    });
}

const targetPath = path.resolve(process.cwd(), 'client/src');
migrateSharedImports(targetPath);
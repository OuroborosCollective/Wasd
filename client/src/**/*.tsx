const fs = require('fs');
const path = require('path');

/**
 * Durchsucht das Verzeichnis client/src rekursiv nach .tsx Dateien
 * und aktualisiert die Import-Statements von 'shared' zu '@app/shared'.
 */
function updateSharedImports(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      updateSharedImports(filePath);
    } else if (filePath.endsWith('.tsx')) {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // Regex erklärt:
      // from\s+        -> Matcht 'from' gefolgt von Whitespace
      // (['"])         -> Capture Group 1: Matcht öffnendes Anführungszeichen (einfach oder doppelt)
      // shared         -> Matcht den exakten String 'shared'
      // (\/.*?)?       -> Capture Group 2: Optionaler Match für Deep-Imports (beginnend mit /)
      // \1             -> Matcht das entsprechende schließende Anführungszeichen aus Gruppe 1
      const updatedContent = originalContent.replace(
        /from\s+(['"])shared(\/.*?)?\1/g,
        'from $1@app/shared$2$1'
      );

      if (originalContent !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
      }
    }
  });
}

const targetDir = path.resolve(process.cwd(), 'client/src');
updateSharedImports(targetDir);
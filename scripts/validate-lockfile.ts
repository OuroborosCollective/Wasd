import * as fs from 'fs';
import * as yaml from 'yaml';
import * path from 'path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface LockfileImporter {
  dependencies?: Record<string, any>;
  devDependencies?: Record<string, any>;
}

interface Lockfile {
  importers?: {
    '.': LockfileImporter;
  };
}

interface Mismatch {
  Package: string;
  'package.json-Version': string;
  'Lockfile-Version': string;
}

const packageJsonPath = path.join(process.cwd(), 'package.json');
const lockfilePath = path.join(process.cwd(), 'pnpm-lock.yaml');

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(lockfilePath)) {
  console.error('Fehler: package.json oder pnpm-lock.yaml nicht gefunden.');
  process.exit(1);
}

const packageJson: PackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const lockfile: Lockfile = yaml.parse(fs.readFileSync(lockfilePath, 'utf8'));

const rootImporter = lockfile.importers?.['.'];

if (!rootImporter) {
  console.error('Fehler: Keine Importer-Einträge für "." in der pnpm-lock.yaml gefunden.');
  process.exit(1);
}

const mismatches: Mismatch[] = [];

function validateDependencies(
  pkgDeps: Record<string, string> | undefined,
  lockDeps: Record<string, any> | undefined
) {
  if (!pkgDeps) return;

  for (const [name, version] of Object.entries(pkgDeps)) {
    const lockEntry = lockDeps?.[name];
    
    let lockVersion = '';
    if (typeof lockEntry === 'string') {
      lockVersion = lockEntry;
    } else if (lockEntry && typeof lockEntry === 'object') {
      lockVersion = lockEntry.specifier || lockEntry.version || 'unknown';
    } else {
      lockVersion = 'MISSING';
    }

    if (version !== lockVersion) {
      mismatches.push({
        Package: name,
        'package.json-Version': version,
        'Lockfile-Version': lockVersion
      });
    }
  }
}

validateDependencies(packageJson.dependencies, rootImporter.dependencies);
validateDependencies(packageJson.devDependencies, rootImporter.devDependencies);

if (mismatches.length > 0) {
  console.error('Abweichungen zwischen package.json und pnpm-lock.yaml gefunden:');
  console.table(mismatches);
  process.exit(1);
} else {
  console.log('Validierung erfolgreich: package.json und pnpm-lock.yaml sind synchron.');
  process.exit(0);
}
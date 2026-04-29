import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

export interface DriftReport {
    hasDrift: boolean;
    packageHash: string;
    lockfileHash: string;
}

export class DriftDetector {
    private readonly projectRoot: string;
    private readonly dependencySections = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'resolutions',
        'overrides',
        'pnpm'
    ];

    constructor(projectRoot: string = process.cwd()) {
        this.projectRoot = projectRoot;
    }

    public detect(): DriftReport {
        const packageHash = this.calculatePackageHash();
        const lockfileHash = this.calculateLockfileSpecifiersHash();

        return {
            hasDrift: packageHash !== lockfileHash,
            packageHash,
            lockfileHash
        };
    }

    private calculatePackageHash(): string {
        const pkgPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json not found');
        }

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const dataToHash: Record<string, any> = {};

        for (const section of this.dependencySections) {
            if (pkg[section]) {
                dataToHash[section] = this.sortObjectKeys(pkg[section]);
            }
        }

        return this.generateMd5(JSON.stringify(dataToHash));
    }

    private calculateLockfileSpecifiersHash(): string {
        const lockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');
        if (!fs.existsSync(lockPath)) {
            return '';
        }

        const content = fs.readFileSync(lockPath, 'utf8');
        const specifiers: Record<string, any> = {};
        
        // Manual extraction of specifiers to avoid heavy YAML dependency
        // In pnpm-lock.yaml, specifiers are usually under importers -> "." -> specifiers
        // or directly in older versions.
        const lines = content.split('\n');
        let inSpecifiers = false;
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'specifiers:') {
                inSpecifiers = true;
                continue;
            }
            
            if (inSpecifiers) {
                if (line.startsWith('  ') && trimmed.includes(':')) {
                    const [key, value] = trimmed.split(':').map(s => s.trim());
                    specifiers[key] = value.replace(/['"]/g, '');
                } else if (trimmed !== '' && !line.startsWith('    ')) {
                    inSpecifiers = false;
                }
            }
        }

        // pnpm-lock.yaml specifiers are a flat list, we need to map them back 
        // to match the structure of package.json sections for a valid comparison
        // or we simply hash the sorted specifiers list. 
        // For drift detection, comparing the package.json deps vs lockfile specifiers is the key.
        return this.generateMd5(JSON.stringify(this.sortObjectKeys(specifiers)));
    }

    private sortObjectKeys(obj: any): any {
        if (typeof obj !== 'object' || obj === null) return obj;
        return Object.keys(obj)
            .sort()
            .reduce((acc: any, key: string) => {
                acc[key] = obj[key];
                return acc;
            }, {});
    }

    private generateMd5(data: string): string {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    public verifyChecksumFile(checksumPath: string): boolean {
        if (!fs.existsSync(checksumPath)) return false;
        const storedHash = fs.readFileSync(checksumPath, 'utf8').trim();
        return storedHash === this.calculatePackageHash();
    }

    public updateChecksumFile(checksumPath: string): void {
        const hash = this.calculatePackageHash();
        const dir = path.dirname(checksumPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(checksumPath, hash, 'utf8');
    }
}
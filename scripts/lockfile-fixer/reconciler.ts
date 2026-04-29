import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PackageDiff {
    name: string;
    oldVersion?: string;
    newVersion?: string;
    type: 'added' | 'removed' | 'updated';
}

export interface ReconcileResult {
    success: boolean;
    diff: PackageDiff[];
    error?: string;
}

export class AutoReconciler {
    private lockfilePath: string;
    private projectRoot: string;

    constructor(projectRoot: string = process.cwd()) {
        this.projectRoot = projectRoot;
        this.lockfilePath = path.join(projectRoot, 'pnpm-lock.yaml');
    }

    public reconcile(): ReconcileResult {
        try {
            const before = this.snapshotLockfile();
            
            this.executePnpmUpdate();
            
            const after = this.snapshotLockfile();
            const diff = this.calculateDiff(before, after);

            return {
                success: true,
                diff
            };
        } catch (error: any) {
            return {
                success: false,
                diff: [],
                error: error.message
            };
        }
    }

    private executePnpmUpdate(): void {
        execSync('pnpm install --lockfile-only', {
            cwd: this.projectRoot,
            stdio: 'pipe',
            env: { ...process.env, NO_COLOR: '1' }
        });
    }

    private snapshotLockfile(): Map<string, string> {
        const packages = new Map<string, string>();
        
        if (!fs.existsSync(this.lockfilePath)) {
            return packages;
        }

        const content = fs.readFileSync(this.lockfilePath, 'utf-8');
        const lines = content.split('\n');
        
        let inPackagesSection = false;

        for (const line of lines) {
            if (line.startsWith('packages:')) {
                inPackagesSection = true;
                continue;
            }

            if (inPackagesSection) {
                if (line.length > 0 && !line.startsWith('  ')) {
                    inPackagesSection = false;
                    continue;
                }

                const match = line.match(/\s+\/([^@]+)@([^\s:]+)/);
                if (match) {
                    const [, name, version] = match;
                    packages.set(decodeURIComponent(name), version);
                }
            }
        }

        return packages;
    }

    private calculateDiff(before: Map<string, string>, after: Map<string, string>): PackageDiff[] {
        const diff: PackageDiff[] = [];
        const allPackageNames = new Set([...before.keys(), ...after.keys()]);

        for (const name of allPackageNames) {
            const oldVersion = before.get(name);
            const newVersion = after.get(name);

            if (!oldVersion && newVersion) {
                diff.push({ name, newVersion, type: 'added' });
            } else if (oldVersion && !newVersion) {
                diff.push({ name, oldVersion, type: 'removed' });
            } else if (oldVersion && newVersion && oldVersion !== newVersion) {
                diff.push({ name, oldVersion, newVersion, type: 'updated' });
            }
        }

        return diff.sort((a, b) => a.name.localeCompare(b.name));
    }
}
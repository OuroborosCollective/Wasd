import * as semver from 'semver';

export interface LockfileChange {
    packageName: string;
    oldVersion: string;
    newVersion: string;
}

export interface EnforcerConfig {
    allowedMajorUpdates: string[];
}

export class PolicyEnforcer {
    private allowedMajorUpdates: Set<string>;

    constructor(config: EnforcerConfig) {
        this.allowedMajorUpdates = new Set(config.allowedMajorUpdates);
    }

    public enforce(changes: LockfileChange[]): void {
        const violations: string[] = [];

        for (const change of changes) {
            if (!semver.valid(change.oldVersion) || !semver.valid(change.newVersion)) {
                continue;
            }

            const diff = semver.diff(change.oldVersion, change.newVersion);

            if (diff === 'major') {
                if (!this.allowedMajorUpdates.has(change.packageName)) {
                    violations.push(
                        `${change.packageName}: ${change.oldVersion} -> ${change.newVersion}`
                    );
                }
            }
        }

        if (violations.length > 0) {
            throw new Error(
                `Policy violation: Unauthorized major version updates detected:\n${violations.join('\n')}\n` +
                `Update the allowlist in the configuration if these changes are intended.`
            );
        }
    }
}
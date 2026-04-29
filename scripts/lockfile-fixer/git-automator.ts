import { execSync } from 'child_process';

export class GitAutomator {
    private readonly branchName = 'fix/lockfile-drift';

    public async execute(): Promise<void> {
        try {
            this.createBranch();
            this.commitChanges();
            this.pushBranch();
            this.createPullRequest();
        } catch (error) {
            process.stderr.write(`Error during Git automation: ${error instanceof Error ? error.message : String(error)}\n`);
            process.exit(1);
        }
    }

    private createBranch(): void {
        this.runCommand(`git checkout -b ${this.branchName} || git checkout ${this.branchName}`);
    }

    private commitChanges(): void {
        this.runCommand('git add pnpm-lock.yaml');
        this.runCommand('git commit -m "chore: fix pnpm lockfile drift"');
    }

    private pushBranch(): void {
        this.runCommand(`git push origin ${this.branchName} --force`);
    }

    private createPullRequest(): void {
        const title = 'fix: resolve pnpm-lock.yaml drift';
        const body = this.generateImpactDescription();
        
        try {
            this.runCommand(`gh pr create --title "${title}" --body "${body}" --head ${this.branchName}`);
        } catch (error) {
            process.stdout.write('Pull Request might already exist or GitHub CLI is not configured.\n');
        }
    }

    private generateImpactDescription(): string {
        const timestamp = new Date().toISOString();
        return `
### Lockfile Fixer Automated PR
This PR resolves inconsistencies in the \`pnpm-lock.yaml\` file.

**Impact:**
- Ensures deterministic builds across environments.
- Synchronizes package specifications with current node_modules state.
- Generated at: ${timestamp}

*Automated by LockfileFixer Script*
        `.trim();
    }

    private runCommand(command: string): string {
        return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
    }
}

if (require.main === module) {
    const automator = new GitAutomator();
    automator.execute();
}
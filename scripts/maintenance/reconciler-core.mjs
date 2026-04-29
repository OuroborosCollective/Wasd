import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RECONCILER_CONFIG = {
    packageJsonPath: join(process.cwd(), 'package.json'),
    gitAutomatorPath: 'scripts/maintenance/git-automator.mjs'
};

const dashboard = {
    driftCheck: { status: 'PENDING', message: '' },
    policyCheck: { status: 'PENDING', message: '' },
    pnpmInstall: { status: 'PENDING', message: '' },
    pnpmAudit: { status: 'PENDING', message: '' },
    gitAutomator: { status: 'PENDING', message: '' }
};

function updateDashboard(step, status, message = '') {
    dashboard[step].status = status;
    dashboard[step].message = message;
}

function printDashboard() {
    console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[34m           MAINTENANCE RECONCILER DASHBOARD               \x1b[0m');
    console.log('\x1b[1m\x1b[34m============================================================\x1b[0m');
    
    for (const [step, data] of Object.entries(dashboard)) {
        let color = '\x1b[33m'; // Yellow
        if (data.status === 'SUCCESS') color = '\x1b[32m'; // Green
        if (data.status === 'FAILED') color = '\x1b[31m'; // Red
        if (data.status === 'DRIFT') color = '\x1b[35m'; // Magenta

        const label = step.padEnd(15);
        const statusStr = data.status.padEnd(10);
        console.log(`${label} | ${color}${statusStr}\x1b[0m | ${data.message}`);
    }
    console.log('\x1b[1m\x1b[34m============================================================\x1b[0m\n');
}

async function startReconciliation() {
    try {
        // 1. Drift-Check
        try {
            const status = execSync('git status --porcelain').toString().trim();
            if (status) {
                updateDashboard('driftCheck', 'DRIFT', 'Uncommitted changes detected');
            } else {
                updateDashboard('driftCheck', 'SUCCESS', 'Working directory clean');
            }
        } catch (e) {
            updateDashboard('driftCheck', 'FAILED', e.message);
        }

        // 2. Policy-Prüfung
        try {
            const pkg = JSON.parse(readFileSync(RECONCILER_CONFIG.packageJsonPath, 'utf-8'));
            const errors = [];
            if (!pkg.engines?.node) errors.push('Missing engines.node');
            if (!pkg.engines?.pnpm) errors.push('Missing engines.pnpm');
            if (!pkg.private) errors.push('Field "private" should be true for maintenance core');
            
            if (errors.length > 0) {
                updateDashboard('policyCheck', 'FAILED', errors.join(', '));
            } else {
                updateDashboard('policyCheck', 'SUCCESS', 'All policies compliant');
            }
        } catch (e) {
            updateDashboard('policyCheck', 'FAILED', 'Could not read package.json');
        }

        // 3. pnpm install
        try {
            console.log('Running: pnpm install --no-frozen-lockfile...');
            execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit' });
            updateDashboard('pnpmInstall', 'SUCCESS', 'Dependencies updated');
        } catch (e) {
            updateDashboard('pnpmInstall', 'FAILED', 'pnpm install failed');
        }

        // 4. Integritätsprüfung
        try {
            console.log('Running: pnpm audit...');
            execSync('pnpm audit', { stdio: 'inherit' });
            updateDashboard('pnpmAudit', 'SUCCESS', 'No critical vulnerabilities');
        } catch (e) {
            updateDashboard('pnpmAudit', 'FAILED', 'Vulnerabilities detected or audit failed');
        }

        // 5. Git-Automator
        try {
            console.log(`Running: ${RECONCILER_CONFIG.gitAutomatorPath}...`);
            execSync(`node ${RECONCILER_CONFIG.gitAutomatorPath}`, { stdio: 'inherit' });
            updateDashboard('gitAutomator', 'SUCCESS', 'Changes committed and pushed');
        } catch (e) {
            updateDashboard('gitAutomator', 'FAILED', 'Git automation failed or script missing');
        }

    } catch (globalError) {
        console.error('Critical Reconciler Core Error:', globalError);
    } finally {
        printDashboard();
    }
}

startReconciliation();
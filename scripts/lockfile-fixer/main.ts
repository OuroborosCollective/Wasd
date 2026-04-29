import { Detector } from './detector';
import { Reconciler } from './reconciler';
import { Enforcer } from './enforcer';
import { Automator } from './automator';

async function run(): Promise<void> {
    const args = process.argv.slice(2);
    const isFixMode = args.includes('--fix');
    const isCheckMode = args.includes('--check');

    const detector = new Detector();
    const reconciler = new Reconciler();
    const enforcer = new Enforcer();
    const automator = new Automator();

    try {
        console.log('Starting lockfile inspection...');
        
        const issues = await detector.detect();
        
        if (issues.length === 0) {
            console.log('No lockfile inconsistencies detected.');
        } else {
            console.warn(`Found ${issues.length} lockfile issue(s).`);
            
            if (isFixMode) {
                console.log('Attempting to reconcile issues...');
                await reconciler.reconcile(issues);
                
                console.log('Running automated cleanup...');
                await automator.run();
            } else if (isCheckMode) {
                console.error('Lockfile issues found in check mode.');
                process.exit(1);
            }
        }

        console.log('Enforcing lockfile policies...');
        const violations = await enforcer.validate();

        if (violations.length > 0) {
            console.error('Lockfile policy violations detected:');
            violations.forEach(violation => {
                console.error(`- [${violation.type}] ${violation.message}`);
            });
            process.exit(1);
        }

        console.log('Lockfile process completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Fatal error during lockfile processing:');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

run();
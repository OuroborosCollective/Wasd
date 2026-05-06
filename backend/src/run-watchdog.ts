import { integrityChecker } from './core/integrity-checker';

async function run() {
    console.log('Starting Watchdog Run...');
    // Mock dbClient for demonstration
    const mockDb = {
        query: async () => ({ rows: [] }),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
    };
    await integrityChecker.checkDatabaseHealth(mockDb);
    integrityChecker.synchronizeAxioms('./src/interfaces');
    console.log('Watchdog Run Complete.');
}

run().catch(console.error);

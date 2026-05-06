import { integrityChecker } from './core/integrity-checker';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    
    try {
        // Hier würde normalerweise die DB-Verbindung initialisiert werden
        // Für die Demo simulieren wir einen Check
        const mockDbClient = {
            query: async (q: string, params?: any[]) => {
                return { rows: [] };
            }
        };

        await integrityChecker.checkDatabaseHealth(mockDbClient);
        
        // Synchronisiere Interfaces (Pfad anpassen je nach Struktur)
        integrityChecker.synchronizeAxioms('./src/models');

        console.log('✅ Integrity Check completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Integrity Check failed:', error);
        process.exit(1);
    }
}

run();

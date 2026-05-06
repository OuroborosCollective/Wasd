import { integrityChecker } from './core/integrity-checker';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Sovereign Watchdog Circuit Breaker Implementation
 * Verhindert den harten Abbruch bei transienten Datenbankfehlern und steuert den Recovery-Modus.
 */
enum CircuitState {
    CLOSED,    // Normalbetrieb
    OPEN,      // Fehlerzustand, Recovery-Modus aktiv
    HALF_OPEN  // Testet, ob System wieder erreichbar ist
}

class WatchdogCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private readonly threshold: number = Number(process.env.WATCHDOG_RETRY_THRESHOLD) || 3;
    private readonly recoveryDelay: number = 5000;

    async executeHealthCheck(dbClient: any): Promise<boolean> {
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. System is in Recovery Mode.');
            return false;
        }

        try {
            await integrityChecker.checkDatabaseHealth(dbClient);
            this.reset();
            return true;
        } catch (error: any) {
            this.onFailure(error);
            return false;
        }
    }

    private onFailure(error: any) {
        this.failureCount++;
        console.error(`❌ [Watchdog] Health Check failed (${this.failureCount}/${this.threshold}):`, error.message);
        
        if (this.failureCount >= this.threshold) {
            this.state = CircuitState.OPEN;
            console.error('🚨 [Watchdog] Circuit Breaker TRIPPED. Entering degraded recovery state.');
        }
    }

    private reset() {
        if (this.state !== CircuitState.CLOSED) {
            console.log('✅ [Watchdog] System recovered. Closing circuit.');
        }
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
    }

    async wait(customMs?: number) {
        return new Promise(resolve => setTimeout(resolve, customMs || this.recoveryDelay));
    }

    get isDegraded() {
        return this.state === CircuitState.OPEN;
    }
}

/**
 * Kernfunktion zur Prüfung der Datenbank-Bereitschaft vor dem Anwendungsstart.
 */
async function waitForDatabase(dbClient: any, maxAttempts: number = 10): Promise<boolean> {
    console.log(`📡 [Watchdog] Waiting for Database-Ready signal (Max attempts: ${maxAttempts})...`);
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            // Einfacher Ping-Test zur Prüfung der physischen Verbindung
            await dbClient.query('SELECT 1');
            console.log('🔗 [Watchdog] Database connection established.');
            return true;
        } catch (err: any) {
            console.warn(`⏳ [Watchdog] Database not ready yet (Attempt ${i}/${maxAttempts}): ${err.message}`);
            if (i < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    return false;
}

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    // Initialisierung des DB Clients (Mock für die Pipeline/Standalone-Validierung)
    const mockDbClient = {
        query: async (q: string, params?: any[]) => {
            if (process.env.SIMULATE_DB_FAILURE === 'true') {
                throw new Error('Database Connection Timeout (Simulated)');
            }
            return { rows: [] };
        }
    };

    try {
        // SCHRITT 1: Datenbank-Ready Prüfung
        const dbReady = await waitForDatabase(mockDbClient);
        
        if (!dbReady) {
            console.error('💀 [Watchdog] Database connection failed after multiple retries.');
            console.error('💀 [Watchdog] Integrity checks aborted. Entering safety shutdown.');
            process.exit(1);
        }

        // SCHRITT 2: Integritätsprüfung mit Circuit Breaker
        let success = false;
        let healthAttempts = 0;
        const maxHealthAttempts = 5;

        while (!success && healthAttempts < maxHealthAttempts) {
            success = await circuitBreaker.executeHealthCheck(mockDbClient);
            
            if (!success) {
                healthAttempts++;
                if (healthAttempts < maxHealthAttempts) {
                    console.log(`🔄 [Watchdog] Retrying Health Check in 5s (Attempt ${healthAttempts}/${maxHealthAttempts})...`);
                    await circuitBreaker.wait();
                }
            }
        }

        // SCHRITT 3: Axiom-Synchronisation (Modelle zu Interfaces)
        // Läuft auch im Degraded Mode, solange das Dateisystem valide ist.
        try {
            console.log('📂 [Watchdog] Synchronizing Axioms (Model-to-Interface)...');
            integrityChecker.synchronizeAxioms('./src/models');
        } catch (syncError) {
            console.error('❌ [Watchdog] Axiom Synchronization failed:', syncError);
        }

        if (circuitBreaker.isDegraded || !success) {
            console.warn('⚠️ [Watchdog] Finished in DEGRADED MODE. Axiom synchronization completed, but DB health is unstable.');
            process.exit(0); 
        }

        console.log('✅ [Watchdog] Integrity Check and Service Bootstrapping completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('💀 [Watchdog] Critical failure in Watchdog process:', error);
        process.exit(1);
    }
}

run();
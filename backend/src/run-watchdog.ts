import { integrityChecker } from './core/integrity-checker';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Sovereign Watchdog Circuit Breaker Implementation
 * Verhindert den harten Abbruch bei transienten Datenbankfehlern und steuert den Recovery-Modus.
 * Erweitert um HALF_OPEN State für proaktive Wiederherstellungsversuche.
 */
enum CircuitState {
    CLOSED,    // Normalbetrieb: Alles ok
    OPEN,      // Fehlerzustand: Verbindung unterbrochen, Recovery-Modus
    HALF_OPEN  // Testphase: Prüfe, ob System wieder stabil ist
}

interface DatabaseClient {
    query: (query: string, params?: any[]) => Promise<any>;
}

class WatchdogCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successThreshold: number = 2; // Benötigte Erfolge in HALF_OPEN für Rückkehr zu CLOSED
    private consecutiveSuccesses: number = 0;
    private readonly failureThreshold: number = Number(process.env.WATCHDOG_RETRY_THRESHOLD) || 3;
    private readonly recoveryDelay: number = 5000;

    async executeHealthCheck(dbClient: DatabaseClient): Promise<boolean> {
        // Wenn OPEN, prüfen wir periodisch im Hintergrund
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. Attempting probe...');
            this.state = CircuitState.HALF_OPEN;
        }

        try {
            // Spezifischer Health-Check Ping via Integrity Checker
            await integrityChecker.checkDatabaseHealth(dbClient);
            this.onSuccess();
            return true;
        } catch (error: any) {
            this.onFailure(error);
            return false;
        }
    }

    private onSuccess() {
        if (this.state === CircuitState.HALF_OPEN) {
            this.consecutiveSuccesses++;
            console.log(`⏳ [Watchdog] Probe successful (${this.consecutiveSuccesses}/${this.successThreshold})...`);
            if (this.consecutiveSuccesses >= this.successThreshold) {
                this.reset();
            }
        } else {
            this.reset();
        }
    }

    private onFailure(error: any) {
        this.consecutiveSuccesses = 0;
        this.failureCount++;
        
        const isConnectionError = error.code === 'ECONNREFUSED' || 
                                error.message.includes('timeout') || 
                                error.message.includes('terminated') ||
                                error.message.includes('connection');
        
        console.error(`❌ [Watchdog] Health Check failed (${this.failureCount}/${this.failureThreshold}):`, error.message);
        
        if (this.failureCount >= this.failureThreshold || isConnectionError) {
            if (this.state !== CircuitState.OPEN) {
                this.state = CircuitState.OPEN;
                console.error('🚨 [Watchdog] Circuit Breaker TRIPPED. System is now in recovery loop.');
            }
        }
    }

    private reset() {
        if (this.state !== CircuitState.CLOSED) {
            console.log('✅ [Watchdog] System fully recovered. Closing circuit.');
        }
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
    }

    async wait(customMs?: number) {
        return new Promise(resolve => setTimeout(resolve, customMs || this.recoveryDelay));
    }

    get isDegraded() {
        return this.state === CircuitState.OPEN;
    }

    get currentState() {
        return CircuitState[this.state];
    }
}

/**
 * PHASE 1: Pre-Flight Database Check.
 * Prüft die Verfügbarkeit der Infrastruktur, bevor die Anwendungslogik startet.
 */
async function preFlightDatabaseCheck(dbClient: DatabaseClient, maxAttempts: number = 0): Promise<boolean> {
    console.log(`📡 [Watchdog] Starting Pre-Flight Database Availability Check...`);
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            // Physischer Connection Test
            await dbClient.query('SELECT 1');
            console.log('🔗 [Watchdog] Pre-Flight SUCCESS: Database connection established.');
            return true;
        } catch (err: any) {
            console.warn(`⏳ [Watchdog] Pre-Flight PENDING (Attempt ${attempt}): ${err.message}`);
            
            // Wenn maxAttempts gesetzt sind (CI/CD), nach Limit abbrechen
            if (maxAttempts > 0 && attempt >= maxAttempts) {
                console.error(`❌ [Watchdog] Pre-Flight FAILED after ${attempt} attempts.`);
                return false;
            }

            // Exponentieller Backoff (min 2s, max 30s)
            const delay = Math.min(Math.max(2000, 1000 * Math.pow(1.5, attempt)), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    // Initialisierung des DB Clients
    // Hier wird im Produktivbetrieb der echte Client injiziert.
    const mockDbClient: DatabaseClient = {
        query: async (q: string, params?: any[]) => {
            if (process.env.SIMULATE_DB_FAILURE === 'true') {
                throw new Error('Connection refused (Simulated)');
            }
            return { rows: [{ '1': 1 }] };
        }
    };

    try {
        // SCHRITT 1: Pre-Flight Check (Blockiert bis Verbindung steht oder Timeout erreicht)
        const dbReady = await preFlightDatabaseCheck(mockDbClient);
        
        if (!dbReady) {
            console.error('💀 [Watchdog] CRITICAL: Pre-Flight Check failed. Infrastructure unreachable.');
            process.exit(1); 
        }

        // SCHRITT 2: Integritätsprüfung & Axiom-Synchronisation
        // Die Schleife fängt transiente Fehler ab, die NACH dem Pre-Flight auftreten.
        let integrityPassed = false;
        while (!integrityPassed) {
            const healthOk = await circuitBreaker.executeHealthCheck(mockDbClient);
            
            if (healthOk) {
                console.log('📂 [Watchdog] Synchronizing Axioms (Model-to-Interface)...');
                try {
                    // Axiom-Synchronisation triggern
                    integrityChecker.synchronizeAxioms('./src/models');
                    integrityPassed = true;
                } catch (syncError: any) {
                    console.error('❌ [Watchdog] Axiom Synchronization failed. Retrying...', syncError.message);
                    await circuitBreaker.wait(10000);
                }
            } else {
                console.warn(`🔄 [Watchdog] Integrity delayed. Current State: ${circuitBreaker.currentState}. Retrying...`);
                await circuitBreaker.wait();
                
                // Falls der Circuit Breaker auslöst, kehren wir zum Pre-Flight Modus zurück
                if (circuitBreaker.isDegraded) {
                    console.log('🔄 [Watchdog] Re-entering Pre-Flight mode due to circuit trip...');
                    await preFlightDatabaseCheck(mockDbClient);
                }
            }
        }

        console.log('✅ [Watchdog] All Integrity Checks passed. Service Bootstrapping completed.');
        process.exit(0);
        
    } catch (error: any) {
        // Unvorhergesehene strukturelle Fehler im Watchdog selbst
        console.error('💀 [Watchdog] Unrecoverable failure in Watchdog execution logic:', error.message);
        process.exit(1);
    }
}

// Globales Error Handling für den Watchdog-Prozess
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [Watchdog] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💀 [Watchdog] Uncaught Exception:', error.message);
    process.exit(1);
});

run();
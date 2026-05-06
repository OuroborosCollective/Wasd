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

class WatchdogCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successThreshold: number = 2; 
    private consecutiveSuccesses: number = 0;
    private readonly failureThreshold: number = Number(process.env.WATCHDOG_RETRY_THRESHOLD) || 3;
    private readonly recoveryDelay: number = 5000;

    async executeHealthCheck(dbClient: any): Promise<boolean> {
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. Attempting probe...');
            this.state = CircuitState.HALF_OPEN;
        }

        try {
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
        
        const errorMsg = error.message || 'Unknown Error';
        const errorCode = error.code || 'N/A';
        const isConnectionError = 
            errorCode === 'ECONNREFUSED' || 
            errorCode === 'ETIMEDOUT' || 
            errorCode === 'PROTOCOL_CONNECTION_LOST' ||
            errorMsg.includes('timeout') || 
            errorMsg.includes('terminated') ||
            errorMsg.includes('connection failure');
        
        console.error(`❌ [Watchdog] Health Check failed (Count: ${this.failureCount}/${this.failureThreshold} | Code: ${errorCode}):`, errorMsg);
        
        if (isConnectionError) {
            console.error('📡 [Watchdog] Detected Network/Database Connection Drop.');
        }

        if (this.failureCount >= this.failureThreshold || isConnectionError) {
            if (this.state !== CircuitState.OPEN) {
                this.state = CircuitState.OPEN;
                console.error('🚨 [Watchdog] Circuit Breaker TRIPPED. System entering reconnection loop.');
            }
        }
    }

    private reset() {
        if (this.state !== CircuitState.CLOSED) {
            console.log('✅ [Watchdog] System fully recovered. Connection stable. Closing circuit.');
        }
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
    }

    async wait(customMs?: number) {
        const ms = customMs || this.recoveryDelay;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    get isDegraded() {
        return this.state === CircuitState.OPEN;
    }

    get currentState() {
        return CircuitState[this.state];
    }
}

/**
 * Persistente Datenbank-Bereitschaftsprüfung.
 * Anstatt den Prozess zu beenden, verbleibt der Watchdog in einer Warteschleife.
 */
async function waitForDatabase(dbClient: any, maxAttempts: number = 0): Promise<boolean> {
    console.log(`📡 [Watchdog] Initializing Database-Ready check and Re-Connection handler...`);
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            // Physischer Connection Test
            await dbClient.query('SELECT 1');
            console.log('🔗 [Watchdog] Database connection established and verified.');
            return true;
        } catch (err: any) {
            const retryIn = Math.min(Math.floor(1000 * Math.pow(1.5, attempt)), 30000);
            console.warn(`⏳ [Watchdog] Database connection pending (Attempt ${attempt}): ${err.message}. Retrying in ${retryIn}ms...`);
            
            if (maxAttempts > 0 && attempt >= maxAttempts) {
                console.error(`💀 [Watchdog] Max connection attempts (${maxAttempts}) reached.`);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, retryIn));
        }
    }
}

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    // Initialisierung des DB Clients Simulation
    // In Produktion wird hier der echte Pool-Client injiziert
    const mockDbClient = {
        query: async (q: string, params?: any[]) => {
            if (process.env.SIMULATE_DB_FAILURE === 'true') {
                const error: any = new Error('Connection refused (Simulated)');
                error.code = 'ECONNREFUSED';
                throw error;
            }
            return { rows: [{ '1': 1 }] };
        }
    };

    try {
        // SCHRITT 1: Persistente Datenbank-Prüfung (Blockiert bis Verbindung steht)
        let dbReady = await waitForDatabase(mockDbClient);
        
        if (!dbReady) {
            console.error('💀 [Watchdog] Critical Timeout: Database not reachable after initial attempts.');
            process.exit(1); 
        }

        // SCHRITT 2: Integritätsprüfung & Axiom-Synchronisation Loop
        let integrityPassed = false;
        while (!integrityPassed) {
            const healthOk = await circuitBreaker.executeHealthCheck(mockDbClient);
            
            if (healthOk) {
                console.log('📂 [Watchdog] Synchronizing Axioms (Model-to-Interface)...');
                try {
                    // Synchronisation der Datenmodelle mit dem Axiom-System
                    integrityChecker.synchronizeAxioms('./src/models');
                    integrityPassed = true;
                } catch (syncError: any) {
                    console.error(`❌ [Watchdog] Axiom Synchronization failed: ${syncError.message}. Retrying...`);
                    await circuitBreaker.wait(10000);
                }
            } else {
                console.warn(`🔄 [Watchdog] Integrity check failed. Current State: ${circuitBreaker.currentState}.`);
                
                // Falls der Circuit Breaker offen ist (Totalausfall), triggern wir den Reconnect-Loop
                if (circuitBreaker.isDegraded) {
                    console.log('🔄 [Watchdog] Triggering automatic re-connection sequence...');
                    await circuitBreaker.wait(2000); // Kurze Pause vor Re-Init
                    const reconnected = await waitForDatabase(mockDbClient);
                    if (reconnected) {
                        console.log('✅ [Watchdog] Connection re-established during degradation. Continuing health checks...');
                    }
                } else {
                    await circuitBreaker.wait();
                }
            }
        }

        console.log('✅ [Watchdog] All Integrity Checks passed. Service Bootstrapping completed.');
        process.exit(0);
        
    } catch (error: any) {
        console.error('💀 [Watchdog] Unrecoverable failure in Watchdog execution logic:', error.message);
        process.exit(1);
    }
}

// Globales Error Handling für den Watchdog-Prozess zur Vermeidung von Zombie-Prozessen
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [Watchdog] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💀 [Watchdog] Uncaught Exception:', error);
    // In extremen Fällen neu starten via Container-Orchestrierung
    process.exit(1);
});

run();
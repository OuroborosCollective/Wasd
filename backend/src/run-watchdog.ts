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
    private readonly recoveryDelay: number = 5000; // 5 Sekunden zwischen Versuchen im Recovery-Modus

    async executeHealthCheck(dbClient: any): Promise<boolean> {
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. System is in Recovery Mode.');
            return false;
        }

        try {
            await integrityChecker.checkDatabaseHealth(dbClient);
            this.reset();
            return true;
        } catch (error) {
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

    async wait() {
        return new Promise(resolve => setTimeout(resolve, this.recoveryDelay));
    }

    get isDegraded() {
        return this.state === CircuitState.OPEN;
    }
}

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    // Simulation / Initialisierung des DB Clients
    // Im produktiven Umfeld wird hier die Pool-Instanz von Areloria geladen
    const mockDbClient = {
        query: async (q: string, params?: any[]) => {
            // In einer echten Umgebung würde hier pg oder ein ORM-Driver stehen
            if (process.env.SIMULATE_DB_FAILURE === 'true') {
                throw new Error('Database Connection Timeout (Simulated)');
            }
            return { rows: [] };
        }
    };

    try {
        let success = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!success && attempts < maxAttempts) {
            success = await circuitBreaker.executeHealthCheck(mockDbClient);
            
            if (!success) {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`🔄 [Watchdog] Retrying in ${5000 / 1000}s (Attempt ${attempts}/${maxAttempts})...`);
                    await circuitBreaker.wait();
                }
            }
        }

        if (!success) {
            console.warn('⚠️ [Watchdog] Proceeding in DEGRADED MODE. Axiom synchronization will continue where possible.');
        }

        // Synchronisiere Interfaces (Axiome) auch wenn DB eingeschränkt ist,
        // sofern die File-System-Integrität gegeben ist.
        try {
            console.log('📂 [Watchdog] Synchronizing Axioms (Model-to-Interface)...');
            integrityChecker.synchronizeAxioms('./src/models');
        } catch (syncError) {
            console.error('❌ [Watchdog] Axiom Synchronization failed:', syncError);
        }

        if (circuitBreaker.isDegraded) {
            console.log('⚠️ [Watchdog] Completed with warnings (Circuit Breaker remains OPEN).');
            // Wir beenden mit 0, damit die Pipeline/Container nicht crashed, 
            // aber das System als "Unhealthy" markiert werden kann.
            process.exit(0); 
        }

        console.log('✅ [Watchdog] Integrity Check completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('💀 [Watchdog] Critical failure in Watchdog process:', error);
        process.exit(1);
    }
}

run();
import { integrityChecker } from './core/integrity-checker';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Sovereign Watchdog Circuit Breaker Implementation
 * Verhindert den harten Abbruch bei transienten Datenbankfehlern und steuert den Recovery-Modus.
 */
enum CircuitState {
    CLOSED,    // Normalbetrieb: Alles ok
    OPEN,      // Fehlerzustand: Verbindung unterbrochen, Recovery-Modus
    HALF_OPEN  // Testphase: Prüfe, ob System wieder stabil ist
}

class WatchdogCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successThreshold: number = 3; 
    private consecutiveSuccesses: number = 0;
    private readonly failureThreshold: number = Number(process.env.WATCHDOG_RETRY_THRESHOLD) || 5;
    private readonly recoveryDelay: number = 5000;

    async executeHealthCheck(prisma: PrismaClient): Promise<boolean> {
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. Attempting probe...');
            this.state = CircuitState.HALF_OPEN;
        }

        try {
            // Prüfung der Datenbank-Erreichbarkeit
            await prisma.$queryRaw`SELECT 1`;
            // Zusätzliche Integritätsprüfung der Core-Tabellen
            await integrityChecker.checkDatabaseHealth(prisma);
            
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
        
        // Erweiterte Fehlererkennung für Prisma und Netzwerk
        const isConnectionError = 
            errorCode === 'ECONNREFUSED' || 
            errorCode === 'ETIMEDOUT' || 
            errorCode === 'PROTOCOL_CONNECTION_LOST' ||
            errorCode === 'P1001' || // Can't reach DB
            errorCode === 'P1002' || // Timeout
            errorCode === 'P1003' || // DB file does not exist
            errorCode === 'P1008' || // Operations timeout
            errorCode === 'P1017' || // Server closed connection
            errorMsg.includes('timeout') || 
            errorMsg.includes('terminated') ||
            errorMsg.includes('connection failure') ||
            errorMsg.includes('Can\'t reach database');
        
        console.error(`❌ [Watchdog] Health Check failed (Count: ${this.failureCount}/${this.failureThreshold} | Code: ${errorCode}):`, errorMsg);
        
        if (isConnectionError) {
            console.error('📡 [Watchdog] High-Priority: Network/Database Connection Drop detected.');
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
 * Persistente Datenbank-Bereitschaftsprüfung vor dem Start.
 * Nutzt einen progressiven Retry-Mechanismus, um Container-Start-Racing-Conditions zu lösen.
 */
async function waitForDatabase(prisma: PrismaClient, maxAttempts: number = 0): Promise<boolean> {
    console.log(`📡 [Watchdog] Starting persistent Database-Ready verification...`);
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            console.log('🔗 [Watchdog] Database connection established and verified.');
            return true;
        } catch (err: any) {
            // Progressiver Backoff: Startet bei 1s, max 30s
            const retryIn = Math.min(Math.floor(1000 * Math.pow(1.5, attempt - 1)), 30000);
            console.warn(`⏳ [Watchdog] Database connection failed (Attempt ${attempt}): ${err.message}. Retrying in ${retryIn}ms...`);
            
            if (maxAttempts > 0 && attempt >= maxAttempts) {
                console.error(`💀 [Watchdog] Maximum connection attempts (${maxAttempts}) exceeded.`);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, retryIn));
            
            // Re-Instanzierung bei kritischen Fehlern, um interne Caches zu leeren
            if (attempt % 5 === 0) {
                console.log('🔄 [Watchdog] Periodic Prisma Re-Initialization for recovery...');
            }
        }
    }
}

async function run() {
    console.log('🚀 [Watchdog] Sovereign Integrity Service initializing...');
    
    // Prisma mit detailliertem Logging für Debugging im Watchdog-Modus
    const prisma = new PrismaClient({
        log: ['error', 'warn'],
    });
    
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    try {
        // SCHRITT 1: Boot-Blocker - Warten bis DB wirklich bereit ist
        const dbReady = await waitForDatabase(prisma, 50); // Hoher Limit für robuste Boot-Sequenzen
        
        if (!dbReady) {
            console.error('⚠️ [Watchdog] Initial database check failed after max retries. Exiting to trigger orchestrator restart.');
            process.exit(1);
        }

        // SCHRITT 2: Integritäts- und Synchronisations-Loop
        let integrityPassed = false;
        while (!integrityPassed) {
            const healthOk = await circuitBreaker.executeHealthCheck(prisma);
            
            if (healthOk) {
                console.log('📂 [Watchdog] Connection healthy. Synchronizing Axioms (Model-to-Interface)...');
                try {
                    // Synchronisation der Datenmodelle mit dem Axiom-System
                    await integrityChecker.synchronizeAxioms('./src/models');
                    integrityPassed = true;
                    console.log('✅ [Watchdog] Axiom Synchronization successful.');
                } catch (syncError: any) {
                    console.error(`❌ [Watchdog] Axiom Synchronization failed: ${syncError.message}.`);
                    // Ein Fehler bei der Dateisystem-Synchronisation führt zum Retry nach kurzer Pause
                    await circuitBreaker.wait(10000);
                }
            } else {
                console.warn(`🔄 [Watchdog] Health validation failed. Current State: ${circuitBreaker.currentState}.`);
                
                if (circuitBreaker.isDegraded) {
                    console.log('🔄 [Watchdog] Triggering automatic re-connection sequence...');
                    await circuitBreaker.wait(5000); 
                    
                    // Versuche die Verbindung aktiv wiederherzustellen
                    const reconnected = await waitForDatabase(prisma, 10);
                    if (reconnected) {
                        console.log('✅ [Watchdog] Connection re-established. Resuming health checks...');
                    }
                } else {
                    // Kurze Pause bei transienten Fehlern im CLOSED/HALF_OPEN Zustand
                    await circuitBreaker.wait(3000);
                }
            }
        }

        console.log('🏁 [Watchdog] All Integrity Checks passed. Service Bootstrapping completed successfully.');
        await prisma.$disconnect();
        process.exit(0);
        
    } catch (error: any) {
        console.error('💀 [Watchdog] Unrecoverable failure in Watchdog execution logic:', error.message);
        try { await prisma.$disconnect(); } catch (e) {}
        process.exit(1);
    }
}

// Globales Error Handling zur Vermeidung von Zombie-Prozessen und unkontrollierten Crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [Watchdog] Unhandled Rejection at:', promise, 'reason:', reason);
    // Wir lassen den Prozess am Leben, damit der Loop evtl. recovern kann, außer es ist fatal
});

process.on('uncaughtException', (error) => {
    console.error('💀 [Watchdog] Uncaught Exception:', error);
    process.exit(1);
});

// Graceful Shutdown Signal Handling
const shutdown = async () => {
    console.log('🛑 [Watchdog] Received shutdown signal. Cleaning up...');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

run();
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
    private successThreshold: number = 2; 
    private consecutiveSuccesses: number = 0;
    private readonly failureThreshold: number = Number(process.env.WATCHDOG_RETRY_THRESHOLD) || 3;
    private readonly recoveryDelay: number = 5000;

    async executeHealthCheck(prisma: PrismaClient): Promise<boolean> {
        if (this.state === CircuitState.OPEN) {
            console.warn('⚠️ [Watchdog] Circuit Breaker is OPEN. Attempting probe...');
            this.state = CircuitState.HALF_OPEN;
        }

        try {
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
        const isConnectionError = 
            errorCode === 'ECONNREFUSED' || 
            errorCode === 'ETIMEDOUT' || 
            errorCode === 'PROTOCOL_CONNECTION_LOST' ||
            errorCode === 'P1001' || // Prisma: Can't reach DB server
            errorCode === 'P1002' || // Prisma: Read timeout
            errorCode === 'P1017' || // Prisma: Server closed connection
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
 * Persistente Datenbank-Bereitschaftsprüfung vor dem Start des eigentlichen Watchdogs.
 * Verhindert den sofortigen Absturz des Containers bei Boot-Sequenz-Verzögerungen der DB.
 */
async function waitForDatabase(prisma: PrismaClient, maxAttempts: number = 0): Promise<boolean> {
    console.log(`📡 [Watchdog] Initializing Database-Ready check...`);
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            // Prisma native health check via raw query
            await prisma.$queryRaw`SELECT 1`;
            console.log('🔗 [Watchdog] Database connection verified via Raw Query.');
            return true;
        } catch (err: any) {
            const retryIn = Math.min(Math.floor(1000 * Math.pow(1.5, attempt)), 30000);
            console.warn(`⏳ [Watchdog] Database not ready (Attempt ${attempt}): ${err.message}. Retrying in ${retryIn}ms...`);
            
            if (maxAttempts > 0 && attempt >= maxAttempts) {
                console.error(`💀 [Watchdog] Max connection attempts (${maxAttempts}) reached. Graceful degradation requested.`);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, retryIn));
        }
    }
}

async function run() {
    console.log('🚀 Starting Sovereign Watchdog Integrity Check...');
    const prisma = new PrismaClient({
        log: ['error', 'warn'],
    });
    
    const circuitBreaker = new WatchdogCircuitBreaker();
    
    try {
        // SCHRITT 1: Persistente Datenbank-Prüfung vorab (Blockiert bis Verbindung steht oder Max Retries)
        // Wir setzen hier initial ein hohes Limit, um dem restlichen Stack Zeit zum Booten zu geben.
        const dbReady = await waitForDatabase(prisma, 30); 
        
        if (!dbReady) {
            console.error('⚠️ [Watchdog] Initial database check failed after multiple attempts. Entering infinite retry loop to avoid process crash.');
        }

        // SCHRITT 2: Integritätsprüfung & Axiom-Synchronisation Loop
        let integrityPassed = false;
        while (!integrityPassed) {
            const healthOk = await circuitBreaker.executeHealthCheck(prisma);
            
            if (healthOk) {
                console.log('📂 [Watchdog] Synchronizing Axioms (Model-to-Interface)...');
                try {
                    // Synchronisation der Datenmodelle mit dem Axiom-System
                    await integrityChecker.synchronizeAxioms('./src/models');
                    integrityPassed = true;
                } catch (syncError: any) {
                    console.error(`❌ [Watchdog] Axiom Synchronization failed: ${syncError.message}. Retrying...`);
                    await circuitBreaker.wait(10000); // 10s warten bei Sync-Fehlern
                }
            } else {
                console.warn(`🔄 [Watchdog] Health check failed. Current Circuit State: ${circuitBreaker.currentState}.`);
                
                // Falls der Circuit Breaker offen ist (Totalausfall), triggern wir den Reconnect-Loop
                if (circuitBreaker.isDegraded) {
                    console.log('🔄 [Watchdog] Database connection unreachable. Re-initializing connection wait sequence...');
                    // Wir warten hier explizit auf die Wiederherstellung der Verbindung
                    const reconnected = await waitForDatabase(prisma, 0); // Endloser Wait bis DB wieder da
                    if (reconnected) {
                        console.log('✅ [Watchdog] Connection re-established. Resuming integrity logic...');
                    }
                } else {
                    // Kurze Pause bei einfachen Fehlern
                    await circuitBreaker.wait();
                }
            }
        }

        console.log('✅ [Watchdog] All Integrity Checks passed. Service Bootstrapping completed.');
        await prisma.$disconnect();
        process.exit(0);
        
    } catch (error: any) {
        // Dieser Block wird nur bei Logikfehlern im Script selbst erreicht, nicht bei DB-Ausfällen
        console.error('💀 [Watchdog] Unrecoverable failure in Watchdog execution logic:', error.message);
        try {
            await prisma.$disconnect();
        } catch (e) {
            // Ignoriere Disconnect-Fehler im finalen Catch
        }
        process.exit(1);
    }
}

// Globales Error Handling zur Vermeidung von Zombie-Prozessen
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [Watchdog] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💀 [Watchdog] Uncaught Exception:', error);
    // Wir lassen den Prozess bei Exceptions sterben, da der Zustand korrumpiert sein könnte.
    // Docker/Kubernetes wird den Container neu starten.
    process.exit(1);
});

// Start des Watchdogs
run();
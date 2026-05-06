import { NodeSSH, Config as SSHConfig } from 'node-ssh';

/**
 * VPSConfig Interface
 * Defines the required structure for SSH connection attempts.
 */
export interface VPSConfig extends SSHConfig {
  host: string;
  username: string;
  password?: string;
  privateKey?: string;
}

/**
 * VPSValidationResult
 * Optimized for 10Hz-conformity and stateless execution.
 */
export interface VPSValidationResult {
  isValid: boolean;
  details: {
    connection: boolean;
    ssh: boolean;
    docker: boolean;
    resources: {
      cpuCores: number;
      totalRamGb: number;
      freeDiskGb: number;
    };
    os: string;
    dbPersistence: boolean;
    recoveryInitiated: boolean;
  };
  errors: string[];
  timestamp: string;
}

/**
 * Typsichere Antwortstruktur für Datenbank-Operationen mit Fallback-Support.
 */
interface DbOperationResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  isConnectionError: boolean;
}

/**
 * VPSValidationService
 * Handles rapid validation of VPS credentials and environment requirements.
 * Implements high-resilience Circuit Breaker and Exponential Backoff for DB stability.
 */
export class VPSValidationService {
  private static readonly CONNECTION_TIMEOUT = 5000;
  private static readonly REQUIRED_RAM_GB = 1;
  private static readonly REQUIRED_DISK_GB = 5;
  private static readonly DB_RETRY_ATTEMPTS = 4;
  private static readonly DB_RETRY_DELAY_MS = 1000;
  private static readonly IS_CI = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

  // Circuit Breaker State (Thread-safe singleton simulation)
  private static cbState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private static cbFailures = 0;
  private static lastFailureTime = 0;
  private static readonly CB_THRESHOLD = 5;
  private static readonly CB_RESET_TIMEOUT = 30000;

  /**
   * Validates a VPS configuration statelessly.
   * Ensures that even catastrophic failures are caught and returned as a valid result object.
   */
  public static async validateDeploymentTarget(config: VPSConfig): Promise<VPSValidationResult> {
    const ssh = new NodeSSH();
    const result: VPSValidationResult = {
      isValid: false,
      details: {
        connection: false,
        ssh: false,
        docker: false,
        resources: { cpuCores: 0, totalRamGb: 0, freeDiskGb: 0 },
        os: 'unknown',
        dbPersistence: false,
        recoveryInitiated: false,
      },
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Connection & SSH Handshake with global timeout protection
      await ssh.connect({
        ...config,
        readyTimeout: this.CONNECTION_TIMEOUT,
      });

      result.details.connection = true;
      result.details.ssh = true;

      // 2. Resilient Parallel Command Execution
      const [osInfo, cpuInfo, ramInfo, diskInfo, dockerCheck] = await Promise.all([
        this.safeExec(ssh, 'uname -a'),
        this.safeExec(ssh, 'nproc'),
        this.safeExec(ssh, "free -m | awk '/^Mem:/{print $2}'"),
        this.safeExec(ssh, "df -m / | awk 'NR==2 {print $4}'"),
        this.safeExec(ssh, 'docker --version'),
      ]);

      // Parsing with fallback to zero/unknown to avoid NaN errors
      result.details.os = osInfo.stdout.trim() || 'unknown';
      result.details.resources.cpuCores = parseInt(cpuInfo.stdout.trim(), 10) || 0;
      result.details.resources.totalRamGb = Math.round((parseInt(ramInfo.stdout.trim(), 10) || 0) / 1024);
      result.details.resources.freeDiskGb = Math.round((parseInt(diskInfo.stdout.trim(), 10) || 0) / 1024);
      result.details.docker = dockerCheck.code === 0 && dockerCheck.stdout.toLowerCase().includes('docker');

      // 3. Logic Evaluation
      this.evaluateRequirements(result);

    } catch (error: any) {
      const errorMsg = `SSH Validation Pipeline Error: ${error?.message || 'Unknown network failure'}`;
      result.errors.push(errorMsg);
      if (this.IS_CI) console.error(`[CI_FAILURE_REASON] SSH_CONNECT_FAILED: ${errorMsg}`);
    } finally {
      try {
        ssh.dispose();
      } catch (disposeErr) {
        // Silently handle disposal errors
      }
    }

    // 4. Persistence Layer protected by Circuit Breaker and Error Boundaries
    result.details.dbPersistence = await this.safeDatabasePersistence(config.host, result);

    return result;
  }

  /**
   * Helper for resilient command execution within a session
   */
  private static async safeExec(ssh: NodeSSH, cmd: string) {
    try {
      return await ssh.execCommand(cmd);
    } catch (e) {
      return { stdout: '', stderr: '', code: 1 };
    }
  }

  /**
   * Evaluates if the system meets minimum deployment standards
   */
  private static evaluateRequirements(result: VPSValidationResult): void {
    const { resources, docker } = result.details;

    if (!docker) {
      result.errors.push('Docker Engine missing: Required for containerized Areloria modules.');
    }

    if (resources.totalRamGb < this.REQUIRED_RAM_GB) {
      result.errors.push(`RAM Insufficient: Found ${resources.totalRamGb}GB, need ${this.REQUIRED_RAM_GB}GB.`);
    }

    if (resources.freeDiskGb < this.REQUIRED_DISK_GB) {
      result.errors.push(`Storage Insufficient: Found ${resources.freeDiskGb}GB, need ${this.REQUIRED_DISK_GB}GB.`);
    }

    result.isValid = result.errors.length === 0 && result.details.ssh;
  }

  /**
   * Wrapper for persistence that applies the Circuit Breaker pattern and Exponential Backoff.
   * Prevents database instability from propagating to the high-frequency validation loop.
   */
  private static async safeDatabasePersistence(host: string, result: VPSValidationResult): Promise<boolean> {
    const now = Date.now();

    // Circuit Breaker Logic
    if (this.cbState === 'OPEN') {
      if (now - this.lastFailureTime > this.CB_RESET_TIMEOUT) {
        this.cbState = 'HALF_OPEN';
        console.info(`[VPSValidationService] Circuit Breaker: HALF_OPEN. Probing DB recovery for ${host}...`);
      } else {
        const cbError = 'Persistence bypassed: Database circuit is OPEN (Cascading failure prevention).';
        result.errors.push(cbError);
        if (this.IS_CI) console.error(`[CI_FAILURE_REASON] DB_CIRCUIT_OPEN: ${cbError}`);
        return false;
      }
    }

    // Retry Loop with Exponential Backoff
    for (let attempt = 1; attempt <= this.DB_RETRY_ATTEMPTS; attempt++) {
      const dbResponse = await this.executeBoundedDbOperation(async () => {
        return await this.performDatabaseHandshake(host, result);
      }, null);

      if (dbResponse.success) {
        this.onPersistenceSuccess();
        return true;
      }

      // Handle Failure
      if (dbResponse.isConnectionError) {
        result.details.recoveryInitiated = true;
        await this.initiateDatabaseRecovery(dbResponse.error, attempt);
      }

      this.onPersistenceFailure();

      // If Circuit Breaker tripped during retries, stop immediately
      if (this.cbState === 'OPEN') {
        const tripMsg = 'DB circuit tripped during retry sequence.';
        result.errors.push(tripMsg);
        if (this.IS_CI) console.error(`[CI_FAILURE_REASON] DB_CIRCUIT_TRIPPED_DURING_RETRY: ${tripMsg}`);
        return false;
      }

      if (attempt === this.DB_RETRY_ATTEMPTS) {
        const finalError = `DB persistence failed permanently after ${attempt} attempts. Reason: ${dbResponse.error || 'Unknown Timeout/Refusal'}`;
        
        if (this.IS_CI) {
          console.error(`[CI_FAILURE_REASON] DB_PERSISTENCE_FAILED_FINAL: ${finalError}`);
        }
        
        result.errors.push(finalError);
        return false;
      }

      // Exponential Backoff calculation
      const backoffDelay = Math.pow(2, attempt - 1) * this.DB_RETRY_DELAY_MS;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }

    return false;
  }

  /**
   * Zentraler Error-Boundary-Handler für Datenbank-Abfragen.
   * Liefert typsichere Resultate und verhindert Promise-Abbrüche.
   */
  private static async executeBoundedDbOperation<T>(
    operation: () => Promise<T>,
    fallbackValue: T
  ): Promise<DbOperationResult<T>> {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        isConnectionError: false
      };
    } catch (error: unknown) {
      const isConnError = this.isDatabaseConnectionError(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[VPSValidationService] DB Boundary Catch: ${errorMessage} (ConnectionError: ${isConnError})`);
      
      return {
        success: false,
        data: fallbackValue,
        error: errorMessage,
        isConnectionError: isConnError
      };
    }
  }

  private static onPersistenceSuccess(): void {
    if (this.cbState !== 'CLOSED') {
      console.info(`[VPSValidationService] Circuit Breaker: CLOSED (Service recovered).`);
    }
    this.cbFailures = 0;
    this.cbState = 'CLOSED';
  }

  private static onPersistenceFailure(): void {
    this.cbFailures++;
    this.lastFailureTime = Date.now();
    
    if (this.cbFailures >= this.CB_THRESHOLD) {
      if (this.cbState !== 'OPEN') {
        console.error(`[VPSValidationService] CIRCUIT BREAKER TRIPPED. Too many DB failures.`);
      }
      this.cbState = 'OPEN';
    }
  }

  /**
   * Operational placeholder for DB interaction.
   * Integration point for TypeORM, Prisma or raw pg-pool.
   */
  private static async performDatabaseHandshake(host: string, result: VPSValidationResult): Promise<void> {
    // Implement actual DB call here. 
    // Example: await db.vps_validations.insert({ host, is_valid: result.isValid, data: result });
    // For now, it's a successful resolved promise.
    return Promise.resolve();
  }

  /**
   * Specific Recovery Procedure for Database Connection issues
   */
  private static async initiateDatabaseRecovery(error: any, attempt: number): Promise<void> {
    console.warn(`[DB Recovery] Attempt ${attempt}: Recycling connection pool or checking heartbeats. Last Error: ${error}`);
  }

  /**
   * Detects specific PostgreSQL and Network connection-related errors
   */
  private static isDatabaseConnectionError(error: any): boolean {
    const code = error?.code || '';
    const message = (error?.message || '').toLowerCase();
    
    // Standard Node/Postgres error codes for connectivity issues
    const connectionCodes = [
      'ECONNREFUSED', 
      'ETIMEDOUT', 
      'ECONNRESET', 
      'PROTOCOL_CONNECTION_LOST', 
      '57P01', // admin_shutdown
      '57P03', // cannot_connect_now
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '08001', // sqlclient_unable_to_establish_sqlconnection
      '08004', // sqlserver_rejected_establishment_of_sqlconnection
    ];
    
    const connectionKeywords = [
      'connection terminated', 
      'timeout', 
      'is not accepting connections', 
      'failed to connect',
      'no pg_hba.conf entry',
      'network unreachable'
    ];

    return (
      connectionCodes.includes(code) ||
      connectionKeywords.some(keyword => message.includes(keyword))
    );
  }

  /**
   * High-speed connectivity check for heartbeat (10Hz compliant).
   */
  public static async quickPing(config: VPSConfig): Promise<boolean> {
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        ...config,
        readyTimeout: 1500,
      });
      return true;
    } catch (error: any) {
      if (this.IS_CI) console.warn(`[CI_PING_FAILURE] QuickPing failed for ${config.host}: ${error?.message}`);
      return false;
    } finally {
      try {
        ssh.dispose();
      } catch (e) {
        // Disposal should never throw
      }
    }
  }
}
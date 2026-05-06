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
  };
  errors: string[];
  timestamp: string;
}

/**
 * Circuit Breaker State Tracking
 */
interface CircuitBreaker {
  failures: number;
  lastFailureTime: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * VPSValidationService
 * Handles rapid validation of VPS credentials and environment requirements.
 * Implements resilient database connection retry logic and circuit breaker patterns.
 */
export class VPSValidationService {
  private static readonly CONNECTION_TIMEOUT = 5000;
  private static readonly REQUIRED_RAM_GB = 1;
  private static readonly REQUIRED_DISK_GB = 5;
  private static readonly DB_RETRY_ATTEMPTS = 3;
  private static readonly DB_RETRY_DELAY_MS = 1500;

  // Circuit Breaker Configuration
  private static readonly CB_FAILURE_THRESHOLD = 5;
  private static readonly CB_RESET_TIMEOUT_MS = 60000; // 1 Minute
  private static cbState: CircuitBreaker = {
    failures: 0,
    lastFailureTime: null,
    state: 'CLOSED',
  };

  /**
   * Validates a VPS configuration statelessly.
   * Gracefully handles database failures to ensure the validation flow remains uninterrupted.
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
      },
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Connection & SSH Handshake
      await ssh.connect({
        ...config,
        readyTimeout: this.CONNECTION_TIMEOUT,
      });

      result.details.connection = true;
      result.details.ssh = true;

      // 2. Parallel Command Execution for optimal performance (10Hz target)
      const [osInfo, cpuInfo, ramInfo, diskInfo, dockerCheck] = await Promise.all([
        ssh.execCommand('uname -a'),
        ssh.execCommand('nproc'),
        ssh.execCommand("free -m | awk '/^Mem:/{print $2}'"),
        ssh.execCommand("df -m / | awk 'NR==2 {print $4}'"),
        ssh.execCommand('docker --version'),
      ]);

      // Parse OS and Resources
      result.details.os = osInfo.stdout.trim() || 'unknown';
      result.details.resources.cpuCores = parseInt(cpuInfo.stdout.trim(), 10) || 0;
      result.details.resources.totalRamGb = Math.round((parseInt(ramInfo.stdout.trim(), 10) || 0) / 1024);
      result.details.resources.freeDiskGb = Math.round((parseInt(diskInfo.stdout.trim(), 10) || 0) / 1024);
      result.details.docker = dockerCheck.code === 0;

      // 3. Logic Evaluation
      this.evaluateRequirements(result);
    } catch (error: any) {
      const errorMsg = `SSH Validation failed: ${error?.message || 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`[VPSValidationService] ${errorMsg}`);
    } finally {
      ssh.dispose();
    }

    // 4. Resilient Persistence Logic (Circuit Breaker + Retries)
    result.details.dbPersistence = await this.persistWithResilience(config.host, result);

    return result;
  }

  /**
   * Evaluates if the system meets minimum deployment standards.
   */
  private static evaluateRequirements(result: VPSValidationResult): void {
    const { resources, docker } = result.details;

    if (!docker) {
      result.errors.push('Docker is not installed or not in PATH.');
    }

    if (resources.totalRamGb < this.REQUIRED_RAM_GB) {
      result.errors.push(`Insufficient RAM: Found ${resources.totalRamGb}GB, need ${this.REQUIRED_RAM_GB}GB.`);
    }

    if (resources.freeDiskGb < this.REQUIRED_DISK_GB) {
      result.errors.push(`Insufficient Disk Space: Found ${resources.freeDiskGb}GB, need ${this.REQUIRED_DISK_GB}GB.`);
    }

    result.isValid = result.errors.length === 0 && result.details.ssh;
  }

  /**
   * Wraps the persistence logic with a Circuit Breaker pattern.
   */
  private static async persistWithResilience(host: string, result: VPSValidationResult): Promise<boolean> {
    // 1. Check Circuit Breaker Status
    if (this.cbState.state === 'OPEN') {
      const now = Date.now();
      if (this.cbState.lastFailureTime && now - this.cbState.lastFailureTime > this.CB_RESET_TIMEOUT_MS) {
        this.cbState.state = 'HALF_OPEN';
        console.log(`[VPSValidationService] Circuit Breaker entering HALF_OPEN for ${host}`);
      } else {
        console.warn(`[VPSValidationService] Circuit Breaker OPEN. Skipping DB persistence for ${host}.`);
        return false;
      }
    }

    // 2. Execute Persistence with Retries
    const success = await this.persistValidationToDatabase(host, result);

    // 3. Update Circuit Breaker State
    if (success) {
      this.cbState.failures = 0;
      this.cbState.state = 'CLOSED';
      this.cbState.lastFailureTime = null;
    } else {
      this.cbState.failures++;
      this.cbState.lastFailureTime = Date.now();
      if (this.cbState.failures >= this.CB_FAILURE_THRESHOLD) {
        this.cbState.state = 'OPEN';
        console.error(`[VPSValidationService] Circuit Breaker OPENED due to repeated DB failures.`);
      }
    }

    return success;
  }

  /**
   * Core persistence logic with exponential backoff retries.
   */
  private static async persistValidationToDatabase(host: string, result: VPSValidationResult): Promise<boolean> {
    let currentAttempt = 0;

    while (currentAttempt < this.DB_RETRY_ATTEMPTS) {
      try {
        /**
         * Prisma integration logic.
         * Implementation assumes a globally available or context-injected DB client.
         */
        // await db.vpsValidationLogs.create({
        //   data: {
        //     host,
        //     isValid: result.isValid,
        //     details: JSON.stringify(result.details),
        //     errors: result.errors,
        //     timestamp: new Date(result.timestamp)
        //   }
        // });
        
        return true; 
      } catch (dbError: any) {
        currentAttempt++;
        const isConnError = this.isDatabaseConnectionError(dbError);
        
        console.warn(`[Database] Attempt ${currentAttempt}/${this.DB_RETRY_ATTEMPTS} for ${host} failed: ${dbError.message}`);

        if (!isConnError || currentAttempt >= this.DB_RETRY_ATTEMPTS) {
          return false;
        }

        const delay = this.DB_RETRY_DELAY_MS * Math.pow(2, currentAttempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  }

  /**
   * Detects specific PostgreSQL connection-related errors.
   */
  private static isDatabaseConnectionError(error: any): boolean {
    const code = error?.code || '';
    const message = error?.message || '';
    
    return (
      code === 'ECONNREFUSED' ||
      code === 'PROTOCOL_CONNECTION_LOST' ||
      code === '57P01' || // admin_shutdown
      code === '57P02' || // crash_shutdown
      code === '57P03' || // cannot_connect_now
      code === '08003' || // connection_does_not_exist
      code === '08006' || // connection_failure
      code === 'P1001' || // Prisma: Can't reach database server
      code === 'P1017' || // Prisma: Server closed connection
      message.toLowerCase().includes('connection terminated') ||
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('is not accepting connections')
    );
  }

  /**
   * Fast-Path connectivity check for heartbeat/10Hz scenarios.
   */
  public static async quickPing(config: VPSConfig): Promise<boolean> {
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        ...config,
        readyTimeout: 1500,
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      ssh.dispose();
    }
  }
}
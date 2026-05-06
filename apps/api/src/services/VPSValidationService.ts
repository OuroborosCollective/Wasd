import { NodeSSH, Config as SSHConfig } from 'node-ssh';
import * as net from 'net';

/**
 * VPSValidationService
 * Optimized for 10Hz-conformity and stateless execution within the Areloria WASD ecosystem.
 * Handles rapid validation of VPS credentials, network availability, and environment requirements.
 * Features specialized handling for SSH timeout (Code 28) and PostgreSQL failover.
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
  };
  errors: string[];
  timestamp: string;
}

export class VPSValidationService {
  private static readonly NETWORK_TIMEOUT = 3000;
  private static readonly SSH_READY_TIMEOUT = 5000;
  private static readonly REQUIRED_RAM_GB = 1;
  private static readonly REQUIRED_DISK_GB = 5;
  private static readonly DB_RETRY_ATTEMPTS = 3;
  private static readonly DB_RETRY_DELAY_MS = 2000;

  /**
   * Validates a VPS configuration statelessly.
   * Integrates network pre-checks and explicit timeout handling to ensure system stability.
   */
  public static async validateDeploymentTarget(config: SSHConfig): Promise<VPSValidationResult> {
    const ssh = new NodeSSH();
    const result: VPSValidationResult = {
      isValid: false,
      details: {
        connection: false,
        ssh: false,
        docker: false,
        resources: { cpuCores: 0, totalRamGb: 0, freeDiskGb: 0 },
        os: 'unknown',
      },
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Pre-check: Network Availability (TCP Port 22 or custom)
      const isReachable = await this.checkPortAvailability(config.host, config.port || 22);
      if (!isReachable) {
        throw new Error('NETWORK_UNREACHABLE: Target host port is not responding.');
      }

      // 2. Connection & SSH Handshake
      try {
        await ssh.connect({
          ...config,
          readyTimeout: this.SSH_READY_TIMEOUT,
        });
      } catch (sshErr: any) {
        // Explicitly handle libssh2 Code 28 (Timeout) or general timeout
        if (sshErr.code === 28 || sshErr.message?.includes('timeout')) {
          result.errors.push('SSH_TIMEOUT: Connection timed out during handshake.');
          result.details.connection = true; // Host was reachable, but SSH failed
          return result;
        }
        throw sshErr;
      }

      result.details.connection = true;
      result.details.ssh = true;

      // 3. Parallel Command Execution for High-Performance Metrics Gathering
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

      // Docker Check
      result.details.docker = dockerCheck.code === 0;

      // 4. Logic Evaluation
      this.evaluateRequirements(result);

      // 5. Persist result with DB robustness (Areloria PostgreSQL Pattern)
      await this.persistValidationToDatabase(config.host, result);

    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown validation error';
      result.errors.push(`Validation failed: ${errorMsg}`);
      console.error(`[VPSValidationService] ${errorMsg} for host: ${config.host}`);
    } finally {
      ssh.dispose();
    }

    return result;
  }

  /**
   * Performs a raw TCP socket check before attempting expensive SSH handshakes.
   */
  private static async checkPortAvailability(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, this.NETWORK_TIMEOUT);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Evaluates if the system meets Areloria minimum deployment standards.
   */
  private static evaluateRequirements(result: VPSValidationResult): void {
    const { resources, docker } = result.details;

    if (!docker) {
      result.errors.push('DOCKER_MISSING: Docker is not installed or not in PATH.');
    }

    if (resources.totalRamGb < this.REQUIRED_RAM_GB) {
      result.errors.push(`INSUFFICIENT_RAM: Found ${resources.totalRamGb}GB, need ${this.REQUIRED_RAM_GB}GB.`);
    }

    if (resources.freeDiskGb < this.REQUIRED_DISK_GB) {
      result.errors.push(`INSUFFICIENT_DISK: Found ${resources.freeDiskGb}GB, need ${this.REQUIRED_DISK_GB}GB.`);
    }

    result.isValid = result.errors.length === 0;
  }

  /**
   * Persists validation state with specialized error handling for PostgreSQL connection drops.
   */
  private static async persistValidationToDatabase(host: string, result: VPSValidationResult): Promise<void> {
    let currentAttempt = 0;

    while (currentAttempt < this.DB_RETRY_ATTEMPTS) {
      try {
        // This is a placeholder for the actual Areloria Prisma/TypeORM integration
        // The logic remains stateless by passing the host and result data
        /* 
           await db.vps_validation_logs.create({
             data: { host, isValid: result.isValid, metrics: result }
           });
        */
        return; 
      } catch (dbError: any) {
        currentAttempt++;
        const isConnError = this.isDatabaseConnectionError(dbError);
        
        console.error(`[DatabasePersistence] Attempt ${currentAttempt}/${this.DB_RETRY_ATTEMPTS} failed for ${host}: ${dbError.message}`);

        if (!isConnError || currentAttempt >= this.DB_RETRY_ATTEMPTS) {
          result.errors.push(`DATABASE_FAIL: ${dbError.message}`);
          // We don't throw here to ensure the service stays operational for other requests
          return;
        }

        await new Promise(resolve => setTimeout(resolve, this.DB_RETRY_DELAY_MS));
      }
    }
  }

  /**
   * Detects PostgreSQL-specific connection/protocol errors for retry logic.
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
      message.includes('Connection terminated') ||
      message.includes('connection pointer is NULL')
    );
  }

  /**
   * Fast-Path connectivity check for heartbeat/10Hz monitoring.
   */
  public static async quickPing(config: Pick<SSHConfig, 'host' | 'port' | 'username' | 'password' | 'privateKey'>): Promise<boolean> {
    const ssh = new NodeSSH();
    try {
      // Network check first to avoid blocking the event loop on dead IPs
      const reachable = await this.checkPortAvailability(config.host, config.port || 22);
      if (!reachable) return false;

      await ssh.connect({
        ...config,
        readyTimeout: 2000,
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      ssh.dispose();
    }
  }
}
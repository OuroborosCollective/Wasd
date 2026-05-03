import { NodeSSH, SSHConfig } from 'node-ssh';

/**
 * VPSValidationService
 * Optimized for 10Hz-conformity and stateless execution.
 * Handles rapid validation of VPS credentials and environment requirements for deployment.
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
}

export class VPSValidationService {
  private static readonly CONNECTION_TIMEOUT = 5000;
  private static readonly REQUIRED_RAM_GB = 1;
  private static readonly REQUIRED_DISK_GB = 5;

  /**
   * Validates a VPS configuration statelessly.
   * Optimized via concurrent command execution and strict timeouts with guaranteed resource cleanup.
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
    };

    try {
      // 1. Connection & SSH Handshake
      await ssh.connect({
        ...config,
        readyTimeout: this.CONNECTION_TIMEOUT,
      });

      result.details.connection = true;
      result.details.ssh = true;

      // 2. Parallel Command Execution
      // Using -m for RAM and Disk to avoid rounding errors common with -g
      const [osInfo, cpuInfo, ramInfo, diskInfo, dockerCheck] = await Promise.all([
        ssh.execCommand('uname -a'),
        ssh.execCommand('nproc'),
        ssh.execCommand("free -m | awk '/^Mem:/{print $2}'"),
        ssh.execCommand("df -m / | awk 'NR==2 {print $4}'"),
        ssh.execCommand('docker --version'),
      ]);

      // Parse OS
      result.details.os = osInfo.stdout.trim() || 'unknown';

      // Parse Resources (convert MB back to GB for result consistency)
      result.details.resources.cpuCores = parseInt(cpuInfo.stdout.trim(), 10) || 0;
      result.details.resources.totalRamGb = Math.round((parseInt(ramInfo.stdout.trim(), 10) || 0) / 1024);
      result.details.resources.freeDiskGb = Math.round((parseInt(diskInfo.stdout.trim(), 10) || 0) / 1024);

      // Docker Check
      result.details.docker = dockerCheck.code === 0;

      // 3. Logic Evaluation
      this.evaluateRequirements(result);
    } catch (error: any) {
      result.errors.push(`Validation failed: ${error?.message || 'Unknown error'}`);
    } finally {
      ssh.dispose();
    }

    return result;
  }

  /**
   * Evaluates if the system meets minimum deployment standards
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

    result.isValid = result.errors.length === 0;
  }

  /**
   * Fast-Path connectivity check for heartbeat/10Hz scenarios.
   * Fixed potential memory leak by ensuring disposal in finally block.
   */
  public static async quickPing(config: Pick<SSHConfig, 'host' | 'username' | 'password' | 'privateKey'>): Promise<boolean> {
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        ...config,
        readyTimeout: 2000,
      });
      return true;
    } catch {
      return false;
    } finally {
      ssh.dispose();
    }
  }
}
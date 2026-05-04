import { Logger } from '@are-logic/logger';
import { 
  IVPSState, 
  IVPSHealthStatus, 
  IAutonomousAction, 
  ActionPriority, 
  SystemSubsystem,
  IVPSService
} from '../interfaces/IVPSAutonomous';

/**
 * VPSAutonomousOperationService
 * 
 * Core engine for guaranteeing autonomous operation of VPS systems.
 * Design Pattern: Functional Stateless Loop
 * Performance: Optimized for 10Hz execution (100ms cycle)
 * 
 * --- TECHNICAL DOCUMENTATION: REMOTE EXECUTION & SECURITY ---
 * 
 * 1. NODE-SSH IMPLEMENTATION:
 * - Connectivity: All corrective actions requiring remote execution are dispatched via `node-ssh`.
 * - Session Management: Sessions must be ephemeral. Open connection, execute atomic command, close.
 * - Error Handling: SSH handshake timeouts are set to 5000ms to prevent loop blocking.
 * - Keep-Alive: TCP KeepAlive is enabled to detect silent disconnects during long-running tasks.
 * 
 * 2. SECURITY PROTOCOLS (CREDENTIAL HANDLING):
 * - Zero-Persistence: Private keys must never be stored in plaintext or in the application state.
 * - Secure Injection: Credentials are provided via encrypted environment variables or a secure Vault (AES-256-GCM).
 * - Key-Based Auth: Only Ed25519 SSH keys are permitted. Password-based authentication is strictly prohibited.
 * - Perimeter: SSH agents are isolated; the service account has restricted sudoers permissions (NOPASSWD only for specific binary paths).
 */
export class VPSAutonomousOperationService {
  private static readonly CRITICAL_CPU_THRESHOLD = 90;
  private static readonly CRITICAL_RAM_THRESHOLD = 85;
  private static readonly DISK_RECOVERY_THRESHOLD = 95;

  /**
   * Main entry point for the 10Hz control loop.
   * Processes current state and returns a set of corrective actions.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    const actions: IAutonomousAction[] = [];

    try {
      // 1. Integrity Verification (Parallelized check logic)
      const healthResults = await this.verifySystemIntegrity(currentState);

      // 2. Resource Optimization & Self-Healing
      actions.push(...this.evaluateResources(currentState));

      // 3. Service Continuity Guarantee
      actions.push(...this.evaluateServiceContinuity(healthResults));

      // 4. Security & Perimeter Protection
      actions.push(...this.evaluateSecurityPerimeter(currentState));

      return this.prioritizeActions(actions);
    } catch (error) {
      Logger.error('Autonomous Loop Failure', error);
      return [{
        type: 'SYSTEM_HARD_REBOOT',
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: 'Autonomous Control Loop Interrupted'
      }];
    }
  }

  private static async verifySystemIntegrity(state: IVPSState): Promise<IVPSHealthStatus[]> {
    // Stateless mapping of current service statuses
    return state.services.map((svc: IVPSService): IVPSHealthStatus => ({
      id: svc.id,
      isOperational: svc.status === 'active' && svc.heartbeat > (Date.now() - 5000),
      load: svc.load
    }));
  }

  private static evaluateResources(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];

    if (state.metrics.cpuUsage > this.CRITICAL_CPU_THRESHOLD) {
      actions.push({
        type: 'THROTTLE_NON_ESSENTIAL',
        subsystem: SystemSubsystem.RESOURCES,
        priority: ActionPriority.HIGH,
        reason: 'CPU Overload detected'
      });
    }

    if (state.metrics.ramUsage > this.CRITICAL_RAM_THRESHOLD) {
      actions.push({
        type: 'FLUSH_CACHE_BUFFERS',
        subsystem: SystemSubsystem.MEMORY,
        priority: ActionPriority.MEDIUM,
        reason: 'RAM Pressure'
      });
    }

    if (state.metrics.diskUsage > this.DISK_RECOVERY_THRESHOLD) {
      actions.push({
        type: 'PURGE_LOGS_AND_TEMP',
        subsystem: SystemSubsystem.STORAGE,
        priority: ActionPriority.HIGH,
        reason: 'Storage Capacity Critical'
      });
    }

    return actions;
  }

  private static evaluateServiceContinuity(health: IVPSHealthStatus[]): IAutonomousAction[] {
    return health
      .filter((svc: IVPSHealthStatus) => !svc.isOperational)
      .map((svc: IVPSHealthStatus): IAutonomousAction => ({
        type: 'RESTART_SERVICE',
        targetId: svc.id,
        subsystem: SystemSubsystem.SERVICES,
        priority: ActionPriority.CRITICAL,
        reason: `Service Failure: ${svc.id}`
      }));
  }

  private static evaluateSecurityPerimeter(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    
    if (state.security.unauthorizedAccessAttempts > 5) {
      actions.push({
        type: 'ROTATE_INTERNAL_KEYS',
        subsystem: SystemSubsystem.SECURITY,
        priority: ActionPriority.HIGH,
        reason: 'Brute force detection'
      });
      actions.push({
        type: 'BLOCK_SUSPICIOUS_IPS',
        subsystem: SystemSubsystem.NETWORKING,
        priority: ActionPriority.CRITICAL,
        reason: 'Perimeter Breach Attempt'
      });
    }

    return actions;
  }

  private static prioritizeActions(actions: IAutonomousAction[]): IAutonomousAction[] {
    // Ensure critical actions are executed first and duplicates are removed
    return actions
      .sort((a, b) => b.priority - a.priority)
      .filter((action, index, self) => 
        index === self.findIndex((t: IAutonomousAction) => t.type === action.type && t.targetId === action.targetId)
      );
  }
}
import { Logger } from '@wasd/utils';
import { 
  IVPSState, 
  IVPSHealthStatus, 
  IAutonomousAction, 
  ActionPriority, 
  SystemSubsystem,
  IVPSService
} from '../interfaces/IVPSAutonomous';

export interface IGitMetadata {
  hash: string;
  author: string;
  message: string;
  timestamp: string;
  branch: string;
}

export interface INarrativeLog {
  sequenceId: string;
  timestamp: number;
  origin: string;
  content: string;
  severity: 'INFO' | 'EVOLUTION' | 'REPAIR' | 'CRITICAL';
}

/**
 * VPSAutonomousOperationService
 * 
 * Core engine for guaranteeing autonomous operation of VPS systems.
 */
export class VPSAutonomousOperationService {
  private static readonly CRITICAL_CPU_THRESHOLD = 90;
  private static readonly CRITICAL_RAM_THRESHOLD = 85;
  private static readonly DISK_RECOVERY_THRESHOLD = 95;

  /**
   * Main entry point for the 10Hz control loop.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    const actions: IAutonomousAction[] = [];

    try {
      const healthResults = await this.verifySystemIntegrity(currentState);
      actions.push(...this.evaluateResources(currentState));
      actions.push(...this.evaluateServiceContinuity(healthResults));
      actions.push(...this.evaluateSecurityPerimeter(currentState));

      return this.prioritizeActions(actions);
    } catch (error) {
      new Logger("VPSAutonomous").error('Autonomous Control Loop Failure', error);
      return [{
        type: 'SYSTEM_HARD_REBOOT',
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: 'Autonomous Control Loop Interrupted'
      }];
    }
  }

  /**
   * Processes Git Metadata into In-Game Narrative Chronicles.
   * Maps technical commits to "System Evolution" lore.
   */
  public static processGitLore(commits: IGitMetadata[]): INarrativeLog[] {
    return commits.map((commit): INarrativeLog => {
      const msg = commit.message.toLowerCase();
      let content = '';
      let severity: INarrativeLog['severity'] = 'INFO';

      if (msg.startsWith('feat')) {
        content = `Architect ${commit.author} integrated new neural pathways: ${commit.message}`;
        severity = 'EVOLUTION';
      } else if (msg.startsWith('fix')) {
        content = `Internal repair initiated by ${commit.author} to resolve fragment corruption: ${commit.message}`;
        severity = 'REPAIR';
      } else if (msg.startsWith('refactor')) {
        content = `System optimization cycle performed. Codebase restructured by ${commit.author}.`;
        severity = 'INFO';
      } else {
        content = `Chronicle update: ${commit.message} (Authored by ${commit.author})`;
        severity = 'INFO';
      }

      return {
        sequenceId: commit.hash.substring(0, 8),
        timestamp: new Date(commit.timestamp).getTime(),
        origin: `GIT_REF_${commit.branch.toUpperCase()}`,
        content,
        severity
      };
    });
  }

  private static async verifySystemIntegrity(state: IVPSState): Promise<IVPSHealthStatus[]> {
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
    return actions
      .sort((a, b) => b.priority - a.priority)
      .filter((action, index, self) => 
        index === self.findIndex((t: IAutonomousAction) => t.type === action.type && t.targetId === action.targetId)
      );
  }
}
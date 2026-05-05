import { Logger } from '@are-logic/logger';
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

export interface ILogicPoint {
  id: string;
  source: string;
  value: any;
  timestamp: number;
  isSovereignProtected: boolean;
}

export interface IGlobalTruthState {
  systemIntegrity: number;
  lastOracleSync: number;
  activeAnomalies: string[];
  sovereignClearance: boolean;
}

/**
 * VPSAutonomousOperationService
 * 
 * Orchestrates the closed information loop: 
 * LogicPoints -> AxiomaticOracle -> globalTruthState -> Autonomous Action
 */
export class VPSAutonomousOperationService {
  private static readonly CRITICAL_CPU_THRESHOLD = 90;
  private static readonly CRITICAL_RAM_THRESHOLD = 85;
  private static readonly DISK_RECOVERY_THRESHOLD = 95;

  private static globalTruthState: IGlobalTruthState = {
    systemIntegrity: 100,
    lastOracleSync: Date.now(),
    activeAnomalies: [],
    sovereignClearance: false
  };

  /**
   * Main entry point for the 10Hz control loop.
   * Orchestrates the Axiomatic Information Flow.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    try {
      // 1. Data Ingestion (LogicPoints)
      const logicPoints = this.generateLogicPoints(currentState);

      // 2. Oracle Evaluation (ARE Rules)
      const evaluation = await this.consultAxiomaticOracle(logicPoints);

      // 3. Update Global Truth State
      this.updateGlobalTruth(evaluation);

      // 4. Generate & Prioritize Actions
      const actions: IAutonomousAction[] = [];
      actions.push(...this.evaluateResources(currentState));
      actions.push(...this.evaluateServiceContinuity(await this.verifySystemIntegrity(currentState)));
      actions.push(...this.evaluateSecurityPerimeter(currentState));
      actions.push(...evaluation.recommendedActions);

      return this.prioritizeActions(actions);
    } catch (error) {
      Logger.error('Autonomous Control Loop Failure: System Decoupled from TruthState', error);
      return [{
        type: 'SYSTEM_HARD_REBOOT',
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: 'Oracle Desynchronization Detected'
      }];
    }
  }

  /**
   * Translates raw metrics into Axiomatic LogicPoints.
   * Ensures SOURCE protection for Sovereign-level data.
   */
  private static generateLogicPoints(state: IVPSState): ILogicPoint[] {
    return [
      {
        id: 'LP_CPU_LOAD',
        source: 'KERNEL_METRIC',
        value: state.metrics.cpuUsage,
        timestamp: Date.now(),
        isSovereignProtected: false
      },
      {
        id: 'LP_SECURITY_ROOT',
        source: 'SOVEREIGN_CORE',
        value: state.security.unauthorizedAccessAttempts,
        timestamp: Date.now(),
        isSovereignProtected: true // Only modifiable by Sovereign-Level intervention
      }
    ];
  }

  /**
   * AxiomaticOracle: Applies ARE (Areloria Rules Engine) logic to LogicPoints.
   */
  private static async consultAxiomaticOracle(points: ILogicPoint[]): Promise<{
    integrityScore: number;
    anomalies: string[];
    recommendedActions: IAutonomousAction[];
  }> {
    const anomalies: string[] = [];
    const recommendedActions: IAutonomousAction[] = [];
    let integrityScore = 100;

    for (const point of points) {
      // Protection Check: Prevent non-sovereign modification of protected sources
      if (point.isSovereignProtected && !this.globalTruthState.sovereignClearance) {
        if (point.value > 10) {
          integrityScore -= 30;
          anomalies.push('SOVEREIGN_SOURCE_VIOLATION');
        }
      }

      // Axiomatic Resource Rules
      if (point.id === 'LP_CPU_LOAD' && point.value > this.CRITICAL_CPU_THRESHOLD) {
        integrityScore -= 10;
        anomalies.push('COMPUTE_STRESS');
      }
    }

    return { integrityScore, anomalies, recommendedActions };
  }

  private static updateGlobalTruth(evaluation: { integrityScore: number; anomalies: string[] }): void {
    this.globalTruthState.systemIntegrity = evaluation.integrityScore;
    this.globalTruthState.activeAnomalies = evaluation.anomalies;
    this.globalTruthState.lastOracleSync = Date.now();
    
    // Critical breach of truth leads to automatic lockdown
    if (this.globalTruthState.systemIntegrity < 50) {
      Logger.warn('Axiomatic Integrity Failure: System entering self-preservation mode.');
    }
  }

  /**
   * Processes Git Metadata into In-Game Narrative Chronicles.
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
        reason: 'CPU Overload detected via LogicPoint'
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
        reason: `Service Failure: ${svc.id} - Synced to TruthState`
      }));
  }

  private static evaluateSecurityPerimeter(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    
    if (state.security.unauthorizedAccessAttempts > 5 || this.globalTruthState.activeAnomalies.includes('SOVEREIGN_SOURCE_VIOLATION')) {
      actions.push({
        type: 'ROTATE_INTERNAL_KEYS',
        subsystem: SystemSubsystem.SECURITY,
        priority: ActionPriority.HIGH,
        reason: 'Brute force or Sovereign Violation detection'
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

  /**
   * Sets Sovereign-Level clearance for specific maintenance cycles.
   * Must be called with high-level credentials.
   */
  public static setSovereignClearance(granted: boolean): void {
    Logger.info(`Sovereign Clearance Status Updated: ${granted}`);
    this.globalTruthState.sovereignClearance = granted;
  }
}
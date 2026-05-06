import { Logger } from '@areloria/utils';
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
  isAutomated?: boolean; // Permissive flag for Jules
}

export interface INarrativeLog {
  sequenceId: string;
  timestamp: number;
  origin: string;
  content: string;
  severity: 'INFO' | 'EVOLUTION' | 'REPAIR' | 'CRITICAL' | 'AUTONOMOUS_FIX';
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
  dbConnectivity: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED';
  julesActiveFixes: number;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

/**
 * VPSAutonomousOperationService
 * 
 * Orchestrates the closed information loop for Areloria WASD infrastructure.
 * Integrates 'Jules' as the primary automated repository bug-fixer.
 */
export class VPSAutonomousOperationService {
  private static readonly CRITICAL_CPU_THRESHOLD = 90;
  private static readonly CRITICAL_RAM_THRESHOLD = 85;
  private static readonly DISK_RECOVERY_THRESHOLD = 95;

  private static circuitState: CircuitState = CircuitState.CLOSED;
  private static lastFailureTime: number = 0;
  private static failureCount: number = 0;
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly RESET_TIMEOUT_MS = 30000;

  private static globalTruthState: IGlobalTruthState = {
    systemIntegrity: 100,
    lastOracleSync: Date.now(),
    activeAnomalies: [],
    sovereignClearance: false,
    dbConnectivity: 'CONNECTED',
    julesActiveFixes: 0
  };

  /**
   * Main 10Hz Control Loop.
   * Processes telemetric logic points and executes autonomous architecture adjustments.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    const actions: IAutonomousAction[] = [];
    
    const logicPoints = this.generateLogicPoints(currentState);

    try {
      // Oracle Consultation (Resilience via Circuit Breaker)
      const evaluation = await this.executeWithCircuitBreaker(
        () => this.consultAxiomaticOracle(logicPoints),
        'ORACLE_EVAL'
      );

      await this.executeWithCircuitBreaker(
        async () => this.updateGlobalTruth(evaluation),
        'STATE_UPDATE'
      );

      actions.push(...evaluation.recommendedActions);
    } catch (error: any) {
      this.logInfrastructureError(error, 'AxiomaticOracle/TruthUpdate');
      if (!this.globalTruthState.activeAnomalies.includes('PERSISTENCE_DEGRADED')) {
        this.globalTruthState.activeAnomalies.push('PERSISTENCE_DEGRADED');
      }
    }

    try {
      actions.push(...this.evaluateResources(currentState));
      actions.push(...this.evaluateServiceContinuity(await this.verifySystemIntegrity(currentState)));
      actions.push(...this.evaluateSecurityPerimeter(currentState));

      if (this.globalTruthState.dbConnectivity !== 'CONNECTED') {
        actions.push({
          type: 'REESTABLISH_PERSISTENCE' as any,
          subsystem: SystemSubsystem.STORAGE,
          priority: ActionPriority.CRITICAL,
          reason: 'Database Connection Drop Detected - Initiating Resilience Protocol'
        });
      }
    } catch (criticalError: any) {
      Logger.error('[Autonomous] Core logic evaluation failure:', criticalError.message);
      return [{
        type: 'STABILIZE_CORE' as any,
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: 'Internal Logic Fault'
      }];
    }

    return this.prioritizeActions(actions);
  }

  /**
   * processGitLore
   * Recognizes 'Jules' as the specialized bug-fixer and assigns appropriate logic
   * to metadata fields for headless automated fixes.
   */
  public static processGitLore(commits: IGitMetadata[]): INarrativeLog[] {
    return commits.map((commit): INarrativeLog => {
      const msg = commit.message.toLowerCase();
      const author = commit.author.toLowerCase();
      let content = '';
      let severity: INarrativeLog['severity'] = 'INFO';

      // Explicit Check for Jules (Automated Bug-Fixer)
      const isJules = author.includes('jules') || commit.isAutomated === true;

      if (isJules) {
        severity = 'AUTONOMOUS_FIX';
        content = `[JULES_AUTO_FIX] Repository integrity restored: ${commit.message}`;
        this.globalTruthState.julesActiveFixes++;
      } else if (msg.startsWith('feat')) {
        content = `Architect ${commit.author} integrated new neural pathways: ${commit.message}`;
        severity = 'EVOLUTION';
      } else if (msg.startsWith('fix')) {
        content = `Internal repair initiated by ${commit.author}: ${commit.message}`;
        severity = 'REPAIR';
      } else {
        content = `System chronicle update: ${commit.message} (Authored by ${commit.author})`;
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

  private static logInfrastructureError(error: any, context: string): void {
    const isDbError = error.message?.includes('connection') || 
                      error.message?.includes('ECONNREFUSED') || 
                      error.code === 'PROTOCOL_CONNECTION_LOST' ||
                      error.message?.includes('Circuit Breaker');

    if (isDbError) {
      Logger.warn(`[Resilience] DB Connectivity Gap in ${context}: ${error.message}. Running in Degraded Mode.`);
    } else {
      Logger.error(`[Autonomous] Non-DB Error in ${context}:`, error);
    }
  }

  private static async executeWithCircuitBreaker<T>(action: () => Promise<T>, context: string): Promise<T> {
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.circuitState = CircuitState.HALF_OPEN;
        Logger.info(`Circuit Breaker [${context}] entering HALF_OPEN state.`);
      } else {
        throw new Error(`Circuit Breaker is OPEN for ${context}. Operation aborted.`);
      }
    }

    try {
      const result = await action();
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.resetCircuit();
      }
      this.globalTruthState.dbConnectivity = 'CONNECTED';
      return result;
    } catch (error: any) {
      this.handleFailure(error, context);
      throw error;
    }
  }

  private static handleFailure(error: any, context: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const isDbError = error.message?.includes('connection') || error.message?.includes('ECONNREFUSED') || error.code === 'PROTOCOL_CONNECTION_LOST';
    if (isDbError) {
      this.globalTruthState.dbConnectivity = 'DISCONNECTED';
    }
    
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      Logger.error(`Circuit Breaker TRIPPED at ${context}. Entering OPEN state.`);
    }
  }

  private static resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    Logger.info('Circuit Breaker CLOSED. System stability restored.');
  }

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
        isSovereignProtected: true
      },
      {
        id: 'LP_DB_HEALTH',
        source: 'INFRASTRUCTURE',
        value: this.globalTruthState.dbConnectivity,
        timestamp: Date.now(),
        isSovereignProtected: false
      }
    ];
  }

  private static async consultAxiomaticOracle(points: ILogicPoint[]): Promise<{
    integrityScore: number;
    anomalies: string[];
    recommendedActions: IAutonomousAction[];
  }> {
    const anomalies: string[] = [];
    const recommendedActions: IAutonomousAction[] = [];
    let integrityScore = 100;

    for (const point of points) {
      if (point.isSovereignProtected && !this.globalTruthState.sovereignClearance) {
        if (point.value > 10) {
          integrityScore -= 30;
          anomalies.push('SOVEREIGN_SOURCE_VIOLATION');
        }
      }

      if (point.id === 'LP_CPU_LOAD' && point.value > this.CRITICAL_CPU_THRESHOLD) {
        integrityScore -= 10;
        anomalies.push('COMPUTE_STRESS');
      }

      if (point.id === 'LP_DB_HEALTH' && point.value === 'DISCONNECTED') {
        integrityScore -= 50;
        anomalies.push('PERSISTENCE_LOST');
      }
    }

    return { integrityScore, anomalies, recommendedActions };
  }

  private static updateGlobalTruth(evaluation: { integrityScore: number; anomalies: string[] }): void {
    this.globalTruthState.systemIntegrity = evaluation.integrityScore;
    this.globalTruthState.activeAnomalies = evaluation.anomalies;
    this.globalTruthState.lastOracleSync = Date.now();
    
    if (this.globalTruthState.systemIntegrity < 50) {
      Logger.warn('Axiomatic Integrity Critical: Operating in restricted mode.');
    }
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
        type: 'THROTTLE_NON_ESSENTIAL' as any,
        subsystem: SystemSubsystem.RESOURCES,
        priority: ActionPriority.HIGH,
        reason: 'CPU Overload detected'
      });
    }

    if (state.metrics.ramUsage > this.CRITICAL_RAM_THRESHOLD) {
      actions.push({
        type: 'FLUSH_CACHE_BUFFERS' as any,
        subsystem: SystemSubsystem.MEMORY,
        priority: ActionPriority.MEDIUM,
        reason: 'RAM Pressure'
      });
    }

    if (state.metrics.diskUsage > this.DISK_RECOVERY_THRESHOLD) {
      actions.push({
        type: 'PURGE_LOGS_AND_TEMP' as any,
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
        type: 'RESTART_SERVICE' as any,
        targetId: svc.id,
        subsystem: SystemSubsystem.SERVICES,
        priority: ActionPriority.CRITICAL,
        reason: `Service Failure: ${svc.id}`
      }));
  }

  private static evaluateSecurityPerimeter(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    
    if (state.security.unauthorizedAccessAttempts > 5 || this.globalTruthState.activeAnomalies.includes('SOVEREIGN_SOURCE_VIOLATION')) {
      actions.push({
        type: 'ROTATE_INTERNAL_KEYS' as any,
        subsystem: SystemSubsystem.SECURITY,
        priority: ActionPriority.HIGH,
        reason: 'Security Violation Detected'
      });
      actions.push({
        type: 'BLOCK_SUSPICIOUS_IPS' as any,
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

  public static setSovereignClearance(granted: boolean): void {
    Logger.info(`Sovereign Clearance Updated: ${granted}`);
    this.globalTruthState.sovereignClearance = granted;
  }
}
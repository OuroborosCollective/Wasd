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
  dbConnectivity: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'RECONNECTING';
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

/**
 * VPSAutonomousOperationService
 * 
 * Orchestrates the closed information loop: 
 * LogicPoints -> AxiomaticOracle -> globalTruthState -> Autonomous Action
 * Integrated with Advanced Circuit Breaker and Exponential Backoff for DB/External stability.
 * 
 * ARCHITECTURE: Resilient against DB connection drops using multi-tier retry strategies.
 */
export class VPSAutonomousOperationService {
  private static readonly CRITICAL_CPU_THRESHOLD = 90;
  private static readonly CRITICAL_RAM_THRESHOLD = 85;
  private static readonly DISK_RECOVERY_THRESHOLD = 95;

  // Circuit Breaker & Retry Config
  private static circuitState: CircuitState = CircuitState.CLOSED;
  private static lastFailureTime: number = 0;
  private static failureCount: number = 0;
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly RESET_TIMEOUT_MS = 30000;
  
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;

  private static globalTruthState: IGlobalTruthState = {
    systemIntegrity: 100,
    lastOracleSync: Date.now(),
    activeAnomalies: [],
    sovereignClearance: false,
    dbConnectivity: 'CONNECTED'
  };

  /**
   * Main entry point for the 10Hz control loop.
   * Wrapped in a global boundary to prevent process termination.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    try {
      // 1. Data Ingestion (LogicPoints)
      const logicPoints = this.generateLogicPoints(currentState);

      // 2. Oracle Evaluation (ARE Rules) protected by Circuit Breaker & Retry logic
      const evaluation = await this.executeWithResilience(
        () => this.consultAxiomaticOracle(logicPoints),
        'ORACLE_EVAL'
      );

      // 3. Update Global Truth State (Potentially DB-bound)
      await this.executeWithResilience(
        async () => this.updateGlobalTruth(evaluation),
        'STATE_UPDATE'
      );

      // 4. Generate & Prioritize Actions
      const actions: IAutonomousAction[] = [];
      actions.push(...this.evaluateResources(currentState));
      actions.push(...this.evaluateServiceContinuity(await this.verifySystemIntegrity(currentState)));
      actions.push(...this.evaluateSecurityPerimeter(currentState));
      actions.push(...evaluation.recommendedActions);

      // 5. Handle DB-specific recovery if disconnected
      if (this.globalTruthState.dbConnectivity !== 'CONNECTED') {
        actions.push({
          type: 'REESTABLISH_PERSISTENCE',
          subsystem: SystemSubsystem.STORAGE,
          priority: ActionPriority.CRITICAL,
          reason: `Database Resilience Trigger: ${this.globalTruthState.dbConnectivity}`
        });
      }

      return this.prioritizeActions(actions);
    } catch (error: any) {
      Logger.error(`[AutonomousService] Control Loop suppressed an exception: ${error.message}`);
      
      return [{
        type: 'STABILIZE_CORE',
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: error.message?.includes('Circuit Breaker') 
          ? 'Circuit Breaker Isolation' 
          : 'Unexpected Operation Failure - Auto-Stabilizing'
      }];
    }
  }

  /**
   * Orchestrates Resilience: Retries with Exponential Backoff + Circuit Breaker.
   */
  private static async executeWithResilience<T>(action: () => Promise<T>, context: string): Promise<T> {
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.circuitState = CircuitState.HALF_OPEN;
        Logger.info(`Circuit Breaker [${context}] entering HALF_OPEN state. Attempting recovery...`);
      } else {
        throw new Error(`Circuit Breaker is OPEN for ${context}. Request shed to prevent cascade.`);
      }
    }

    let lastError: any;
    for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await action();
        
        if (this.circuitState === CircuitState.HALF_OPEN) {
          this.resetCircuit();
        }
        
        this.globalTruthState.dbConnectivity = 'CONNECTED';
        return result;
      } catch (error: any) {
        lastError = error;
        const mappedError = this.mapAndLogSecurityError(error, context, attempt);
        
        if (mappedError.isFatal) break;

        if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
          const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          this.globalTruthState.dbConnectivity = 'RECONNECTING';
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.handleCircuitFailure(lastError, context);
    throw lastError;
  }

  private static mapAndLogSecurityError(error: any, context: string, attempt: number): { isFatal: boolean } {
    const msg = error.message?.toLowerCase() || '';
    const code = error.code || '';
    
    let isFatal = false;

    if (msg.includes('connection refused') || code === 'ECONNREFUSED') {
      Logger.warn(`[Resilience] DB Connection Refused in ${context} (Attempt ${attempt + 1}). Checking infrastructure...`);
      this.globalTruthState.dbConnectivity = 'DISCONNECTED';
    } else if (msg.includes('access denied') || code === 'ER_ACCESS_DENIED_ERROR') {
      Logger.error(`[Resilience] Fatal Auth Error in ${context}. Aborting retries.`);
      isFatal = true;
    } else if (msg.includes('timeout') || code === 'ETIMEDOUT') {
      Logger.warn(`[Resilience] Network Timeout in ${context} (Attempt ${attempt + 1}).`);
      this.globalTruthState.dbConnectivity = 'DEGRADED';
    } else {
      Logger.error(`[Resilience] Unmapped Error in ${context}: ${msg}`);
    }

    return { isFatal };
  }

  private static handleCircuitFailure(error: any, context: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      Logger.error(`Circuit Breaker TRIPPED at ${context}. Failure threshold reached. System isolated.`);
    }
  }

  private static resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    Logger.info('Circuit Breaker CLOSED. Axiomatic Oracle sync restored.');
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
      Logger.warn('Axiomatic Integrity Critical: Operating in restricted autonomous mode.');
    }
  }

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
        content = `System optimization cycle performed by ${commit.author}. Logic streamlined.`;
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
        reason: `Service Failure: ${svc.id} - Operational Desync`
      }));
  }

  private static evaluateSecurityPerimeter(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    
    if (state.security.unauthorizedAccessAttempts > 5 || this.globalTruthState.activeAnomalies.includes('SOVEREIGN_SOURCE_VIOLATION')) {
      actions.push({
        type: 'ROTATE_INTERNAL_KEYS',
        subsystem: SystemSubsystem.SECURITY,
        priority: ActionPriority.HIGH,
        reason: 'Security Anomaly Detection'
      });
      actions.push({
        type: 'BLOCK_SUSPICIOUS_IPS',
        subsystem: SystemSubsystem.NETWORKING,
        priority: ActionPriority.CRITICAL,
        reason: 'Active Perimeter Breach Attempt'
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
    Logger.info(`Sovereign Clearance Status Updated: ${granted}`);
    this.globalTruthState.sovereignClearance = granted;
  }
}
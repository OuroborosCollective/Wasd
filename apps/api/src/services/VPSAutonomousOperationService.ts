import { Logger } from '../utils/Logger.js'; // Relativer Import Pfad für @wasd/utils
import { 
  IVPSState, 
  IVPSHealthStatus, 
  IAutonomousAction, 
  ActionPriority, 
  SystemSubsystem,
  IVPSService
} from '../interfaces/IVPSAutonomous.js';
import { LoreNarrativeEngine } from './LoreNarrativeEngine.js';

/**
 * KAPPA STANDARD: Fixed-Point Math (Kappa=1000)
 * 100% = 1000
 * 0.1% = 1
 */
const KAPPA = 1000;

export interface IGitMetadata {
  hash: string;
  author: string;
  message: string;
  timestamp: string;
  branch: string;
  isAutomated?: boolean;
}

export interface INarrativeLog {
  sequenceId: string;
  timestamp: number;
  origin: string;
  content: string;
  severity: 'INFO' | 'EVOLUTION' | 'REPAIR' | 'CRITICAL' | 'AUTONOMOUS_FIX';
  deterministicSeed?: string;
}

export interface ILogicPoint {
  id: string;
  source: string;
  value: any;
  timestamp: number;
  isSovereignProtected: boolean;
}

export interface IGlobalTruthState {
  systemIntegrity: number; // Kappa Value (0-1000)
  lastOracleSync: number;
  activeAnomalies: string[];
  sovereignClearance: boolean;
  dbConnectivity: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED';
  julesActiveFixes: number;
  lastHeartbeat: number;
  narrativeSeed: string;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

/**
 * VPSAutonomousOperationService
 * 
 * Orchestriert den geschlossenen Informationskreislauf der Areloria-Infrastruktur.
 * Nutzt Kappa=1000 für deterministische Berechnungen im 10Hz Tick.
 */
export class VPSAutonomousOperationService {
  // Thresholds in Kappa (90% = 900)
  private static readonly CRITICAL_CPU_THRESHOLD = 900;
  private static readonly CRITICAL_RAM_THRESHOLD = 850;
  private static readonly DISK_RECOVERY_THRESHOLD = 950;

  private static circuitState: CircuitState = CircuitState.CLOSED;
  private static lastFailureTime: number = 0;
  private static failureCount: number = 0;
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly RESET_TIMEOUT_MS = 30000;

  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;

  private static globalTruthState: IGlobalTruthState = {
    systemIntegrity: 1000, // Initial 100.0%
    lastOracleSync: Date.now(),
    activeAnomalies: [],
    sovereignClearance: false,
    dbConnectivity: 'CONNECTED',
    julesActiveFixes: 0,
    lastHeartbeat: Date.now(),
    narrativeSeed: 'Axiom-0'
  };

  /**
   * Main 10Hz Control Loop.
   * Muss innerhalb von 100ms terminieren.
   */
  public static async tick(currentState: IVPSState): Promise<IAutonomousAction[]> {
    this.globalTruthState.lastHeartbeat = Date.now();
    
    this.globalTruthState.narrativeSeed = LoreNarrativeEngine.generateDeterministicSeed(
      `TICK_${Math.floor(Date.now() / 1000)}_${this.globalTruthState.systemIntegrity}`
    );

    const actions: IAutonomousAction[] = [];
    const logicPoints = this.generateLogicPoints(currentState);

    try {
      const evaluation = await this.executeSovereignOperation(
        async () => {
          return await this.consultAxiomaticOracle(logicPoints);
        },
        'ORACLE_SYNC'
      );

      await this.executeSovereignOperation(
        async () => this.updateGlobalTruth(evaluation),
        'STATE_PERSISTENCE'
      );

      actions.push(...evaluation.recommendedActions);
    } catch (error: any) {
      this.logInfrastructureError(error, 'AxiomaticOracle/TruthUpdate');
      this.globalTruthState.dbConnectivity = 'DEGRADED';
      
      if (!this.globalTruthState.activeAnomalies.includes('PERSISTENCE_DEGRADED')) {
        this.globalTruthState.activeAnomalies.push('PERSISTENCE_DEGRADED');
      }
      
      // Kappa Reduktion um 15% (150 Einheiten)
      this.globalTruthState.systemIntegrity = Math.max(this.globalTruthState.systemIntegrity - 150, 300);
    }

    try {
      actions.push(...this.evaluateResources(currentState));
      
      const healthData = await this.verifySystemIntegrity(currentState);
      actions.push(...this.evaluateServiceContinuity(healthData));
      
      actions.push(...this.evaluateSecurityPerimeter(currentState));

      if (this.globalTruthState.dbConnectivity === 'DISCONNECTED') {
        actions.push({
          type: 'REESTABLISH_PERSISTENCE' as any,
          subsystem: SystemSubsystem.STORAGE,
          priority: ActionPriority.CRITICAL,
          reason: `[Seed: ${this.globalTruthState.narrativeSeed}] Database Connection Drop - Initiating Resilience`
        });
      }
    } catch (criticalError: any) {
      Logger.error('[Autonomous] Core logic evaluation failure:', criticalError.message);
      return [{
        type: 'STABILIZE_CORE' as any,
        subsystem: SystemSubsystem.KERNEL,
        priority: ActionPriority.CRITICAL,
        reason: 'Internal Logic Fault - Entering Safe Mode'
      }];
    }

    return this.prioritizeActions(actions);
  }

  private static async executeSovereignOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.circuitState = CircuitState.HALF_OPEN;
        Logger.info(`Circuit Breaker [${context}] HALF_OPEN.`);
      } else {
        throw new Error(`Circuit Breaker OPEN for ${context}.`);
      }
    }

    try {
      const result = await this.retryWithBackoff(operation, context);
      if (this.circuitState !== CircuitState.CLOSED) {
        this.resetCircuit();
      }
      return result;
    } catch (error: any) {
      this.handleFailure(error, context);
      throw error;
    }
  }

  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isTransient = error.message?.toLowerCase().includes('connection') || 
                           error.code === 'ECONNREFUSED' ||
                           error.code === 'ETIMEDOUT';

        if (!isTransient || attempt === this.MAX_RETRIES - 1) throw error;
        const delay = Math.pow(2, attempt) * this.INITIAL_RETRY_DELAY_MS;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  private static handleFailure(error: any, context: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (error.message?.toLowerCase().includes('connection')) {
      this.globalTruthState.dbConnectivity = 'DISCONNECTED';
    }
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
    }
  }

  private static resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.globalTruthState.dbConnectivity = 'CONNECTED';
  }

  public static processGitLore(commits: IGitMetadata[]): INarrativeLog[] {
    return commits.map((commit): INarrativeLog => {
      const author = commit.author.toLowerCase();
      const currentSeed = LoreNarrativeEngine.generateDeterministicSeed(`${commit.hash}_${this.globalTruthState.narrativeSeed}`);
      const isJules = author.includes('jules') || commit.isAutomated === true;

      return {
        sequenceId: String(commit.hash).substring(0, 8), // Sicherstellen, dass sequenceId String ist
        timestamp: new Date(commit.timestamp).getTime(),
        origin: `GIT_REF_${String(commit.branch).toUpperCase()}`,
        content: isJules 
          ? `[JULES_FIX] Integrity restored via Seed ${currentSeed}` 
          : `System update by ${commit.author}: ${commit.message}`,
        severity: isJules ? 'AUTONOMOUS_FIX' : 'INFO',
        deterministicSeed: currentSeed
      };
    });
  }

  public static getSystemHealth() {
    const isAlive = (Date.now() - this.globalTruthState.lastHeartbeat) < 5000;
    return {
      status: isAlive ? 'HEALTHY' : 'STALLED',
      integrity: this.globalTruthState.systemIntegrity, // Kappa Value
      circuit: String(CircuitState[this.circuitState]), // Typ-Mismatch Fix: String Konvertierung
      persistence: this.globalTruthState.dbConnectivity,
      anomalies: this.globalTruthState.activeAnomalies.length,
      julesFixes: this.globalTruthState.julesActiveFixes,
      lastOracleSync: this.globalTruthState.lastOracleSync,
      narrativeSeed: this.globalTruthState.narrativeSeed
    };
  }

  private static logInfrastructureError(error: any, context: string): void {
    Logger.warn(`[Resilience] Error in ${context}: ${error.message}`);
  }

  private static generateLogicPoints(state: IVPSState): ILogicPoint[] {
    return [
      {
        id: 'LP_CPU_LOAD',
        source: 'KERNEL',
        value: state.metrics.cpuUsage, // Erwartet in Kappa
        timestamp: Date.now(),
        isSovereignProtected: false
      },
      {
        id: 'LP_DB_HEALTH',
        source: 'INFRA',
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
    let integrityScore = 1000; // Base Kappa

    for (const point of points) {
      if (point.id === 'LP_CPU_LOAD' && point.value > this.CRITICAL_CPU_THRESHOLD) {
        integrityScore -= 100;
        anomalies.push('COMPUTE_STRESS');
      }
      if (point.id === 'LP_DB_HEALTH' && point.value === 'DISCONNECTED') {
        integrityScore -= 500;
        anomalies.push('PERSISTENCE_LOST');
      }
    }

    return { integrityScore, anomalies, recommendedActions };
  }

  private static updateGlobalTruth(evaluation: { integrityScore: number; anomalies: string[] }): void {
    this.globalTruthState.systemIntegrity = evaluation.integrityScore;
    this.globalTruthState.activeAnomalies = evaluation.anomalies;
    this.globalTruthState.lastOracleSync = Date.now();
  }

  private static async verifySystemIntegrity(state: IVPSState): Promise<IVPSHealthStatus[]> {
    if (!state.services) return [];
    return state.services.map((svc: IVPSService): IVPSHealthStatus => ({
      id: String(svc.id), // Typ-Mismatch Fix
      isOperational: svc.status === 'active' && svc.heartbeat > (Date.now() - 5000),
      load: svc.load // Kappa Value
    }));
  }

  private static evaluateResources(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    const seedCtx = this.globalTruthState.narrativeSeed;

    if (state.metrics.cpuUsage > this.CRITICAL_CPU_THRESHOLD) {
      actions.push({
        type: 'THROTTLE_NON_ESSENTIAL' as any,
        subsystem: SystemSubsystem.RESOURCES,
        priority: ActionPriority.HIGH,
        reason: `CPU Stress [Kappa: ${state.metrics.cpuUsage}] Seed: ${seedCtx}`
      });
    }

    if (state.metrics.ramUsage > this.CRITICAL_RAM_THRESHOLD) {
      actions.push({
        type: 'FLUSH_CACHE' as any,
        subsystem: SystemSubsystem.MEMORY,
        priority: ActionPriority.MEDIUM,
        reason: `RAM Pressure [Kappa: ${state.metrics.ramUsage}]`
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
        reason: `Service Failure: ${svc.id} [Seed: ${this.globalTruthState.narrativeSeed}]`
      }));
  }

  private static evaluateSecurityPerimeter(state: IVPSState): IAutonomousAction[] {
    const actions: IAutonomousAction[] = [];
    if (state.security.unauthorizedAccessAttempts > 5) {
      actions.push({
        type: 'ROTATE_KEYS' as any,
        subsystem: SystemSubsystem.SECURITY,
        priority: ActionPriority.HIGH,
        reason: 'Security Perimeter Alert'
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
    this.globalTruthState.sovereignClearance = granted;
  }
}
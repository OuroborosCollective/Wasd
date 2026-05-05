import { Injectable } from '@nestjs/common';

/**
 * LogicPoint Definition aligned with AxiomaticOracleService
 */
export enum LogicPoint {
  CORE_NUCLEUS = 'CORE_NUCLEUS',
  SIMULATION_GRID = 'SIMULATION_GRID',
  NEURAL_GATEWAY = 'NEURAL_GATEWAY',
  DATA_PERIPHERY = 'DATA_PERIPHERY',
  ASSET_PIPELINE = 'ASSET_PIPELINE'
}

export interface EntityState {
  id: string;
  integrity: number; // 0.0 to 1.0
  weight: number;
  logicPoint: LogicPoint;
  lastUpdate: number;
}

export interface SystemResource {
  id: string;
  type: 'compute' | 'memory' | 'io' | 'network';
  currentLoad: number; // 0.0 to 1.0
  capacity: number;
  priority: number;
}

export interface SystemMetrics {
  latencyMs: number;
  throughput: number;
  errorRate: number;
  backpressure: number;
}

export interface OptimizationState {
  resources: SystemResource[];
  metrics: SystemMetrics;
  entities: EntityState[];
  timestamp: number;
}

export interface OptimizationAction {
  type: 'SCALE_UP' | 'SCALE_DOWN' | 'REBALANCE' | 'THROTTLE' | 'FLUSH' | 'INTEGRITY_REPAIR' | 'NO_OP';
  targetId?: string;
  targetPoint?: LogicPoint;
  priority: number;
  metadata: Record<string, any>;
}

/**
 * ARE-Logic SystemOptimizationService
 * 
 * DESIGN PRINCIPLES:
 * 1. Server-Authority: Enforces the Single Source of Truth for system state.
 * 2. 10Hz-Conformity: O(n) algorithms ensure <100ms execution for 1000+ entities.
 * 3. Axiomatic Alignment: Maps logic points to central Enums for deterministic orchestration.
 */
@Injectable()
export class SystemOptimizationService {
  private readonly CRITICAL_THRESHOLD = 0.85;
  private readonly IDLE_THRESHOLD = 0.20;
  private readonly LATENCY_TARGET_MS = 100;
  private readonly INTEGRITY_MINIMUM = 0.95;

  /**
   * Main optimization cycle.
   * Processes the current system state and returns a list of optimization actions.
   * Performance: O(n) complexity.
   */
  public calculateOptimizations(state: OptimizationState): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    // 1. Calculate Global Integrity Score (O(n))
    const integrityResult = this.calculateIntegrityMetrics(state.entities);
    
    // 2. Integrity Enforcement (Server Authority)
    if (integrityResult.globalScore < this.INTEGRITY_MINIMUM) {
      actions.push(...this.generateIntegrityActions(integrityResult));
    }

    // 3. Resource Load Balancing
    const overloadActions = this.evaluateResourceLoads(state.resources);
    actions.push(...overloadActions);

    // 4. Performance & Backpressure Optimization
    const performanceActions = this.evaluatePerformance(state.metrics);
    actions.push(...performanceActions);

    // 5. Efficiency Consolidation
    if (actions.length === 0) {
      const efficiencyActions = this.evaluateEfficiency(state.resources, state.metrics);
      actions.push(...efficiencyActions);
    }

    return this.sortActionsByUrgency(actions);
  }

  /**
   * Calculates system integrity in O(n)
   */
  private calculateIntegrityMetrics(entities: EntityState[]) {
    let totalWeight = 0;
    let weightedIntegrity = 0;
    const pointAnalysis: Record<LogicPoint, { sum: number; count: number }> = {
      [LogicPoint.CORE_NUCLEUS]: { sum: 0, count: 0 },
      [LogicPoint.SIMULATION_GRID]: { sum: 0, count: 0 },
      [LogicPoint.NEURAL_GATEWAY]: { sum: 0, count: 0 },
      [LogicPoint.DATA_PERIPHERY]: { sum: 0, count: 0 },
      [LogicPoint.ASSET_PIPELINE]: { sum: 0, count: 0 }
    };

    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const weight = entity.weight || 1;
      
      weightedIntegrity += entity.integrity * weight;
      totalWeight += weight;

      // Group logic point metrics in the same pass
      const stats = pointAnalysis[entity.logicPoint];
      if (stats) {
        stats.sum += entity.integrity;
        stats.count++;
      }
    }

    return {
      globalScore: totalWeight > 0 ? weightedIntegrity / totalWeight : 1.0,
      pointAnalysis
    };
  }

  private generateIntegrityActions(integrityResult: any): OptimizationAction[] {
    const actions: OptimizationAction[] = [];
    
    for (const point of Object.values(LogicPoint)) {
      const stats = integrityResult.pointAnalysis[point];
      if (stats.count > 0 && (stats.sum / stats.count) < this.INTEGRITY_MINIMUM) {
        actions.push({
          type: 'INTEGRITY_REPAIR',
          targetPoint: point as LogicPoint,
          priority: 15, // Highest priority for integrity
          metadata: { 
            avgIntegrity: stats.sum / stats.count,
            reason: 'AUTHORITATIVE_SYNC_REQUIRED' 
          }
        });
      }
    }

    return actions;
  }

  private evaluateResourceLoads(resources: SystemResource[]): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    for (let i = 0; i < resources.length; i++) {
      const res = resources[i];
      if (res.currentLoad > this.CRITICAL_THRESHOLD) {
        actions.push({
          type: 'SCALE_UP',
          targetId: res.id,
          priority: 10,
          metadata: { currentLoad: res.currentLoad, reason: 'RESOURCE_EXHAUSTION' }
        });
      } else if (res.currentLoad < this.IDLE_THRESHOLD && res.priority < 5) {
        actions.push({
          type: 'SCALE_DOWN',
          targetId: res.id,
          priority: 3,
          metadata: { currentLoad: res.currentLoad, reason: 'UNDER_UTILIZED' }
        });
      }
    }

    return actions;
  }

  private evaluatePerformance(metrics: SystemMetrics): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    if (metrics.latencyMs > this.LATENCY_TARGET_MS || metrics.backpressure > 0.7) {
      actions.push({
        type: 'THROTTLE',
        priority: 8,
        metadata: { 
          latency: metrics.latencyMs, 
          backpressure: metrics.backpressure,
          reason: 'PERFORMANCE_DEGRADATION' 
        }
      });

      actions.push({
        type: 'REBALANCE',
        priority: 7,
        metadata: { reason: 'LOAD_DISTRIBUTION_REQUIRED' }
      });
    }

    if (metrics.errorRate > 0.05) {
      actions.push({
        type: 'FLUSH',
        priority: 9,
        metadata: { errorRate: metrics.errorRate, reason: 'ERROR_THRESHOLD_EXCEEDED' }
      });
    }

    return actions;
  }

  private evaluateEfficiency(resources: SystemResource[], metrics: SystemMetrics): OptimizationAction[] {
    if (metrics.latencyMs < this.LATENCY_TARGET_MS && metrics.errorRate < 0.01) {
      let lowLoadCount = 0;
      for (let i = 0; i < resources.length; i++) {
        if (resources[i].currentLoad < 0.4) lowLoadCount++;
      }

      if (lowLoadCount > 2) {
        return [{
          type: 'REBALANCE',
          priority: 2,
          metadata: { reason: 'CONSOLIDATION_OPPORTUNITY' }
        }];
      }
    }
    return [];
  }

  private sortActionsByUrgency(actions: OptimizationAction[]): OptimizationAction[] {
    return actions.sort((a, b) => b.priority - a.priority);
  }
}
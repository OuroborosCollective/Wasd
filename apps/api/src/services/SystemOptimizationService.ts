import { Injectable } from '@nestjs/common';

/**
 * ARE-Logic SystemOptimizationService
 * 
 * DESIGN PRINCIPLES:
 * 1. Statelessness: No internal service state; all decisions based on input state.
 * 2. 10Hz-Conformity: Execution time < 100ms to ensure real-time feedback loops.
 * 3. Atomic Operations: Returns optimization instructions rather than mutating directly.
 */

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
  timestamp: number;
}

export interface OptimizationAction {
  type: 'SCALE_UP' | 'SCALE_DOWN' | 'REBALANCE' | 'THROTTLE' | 'FLUSH' | 'NO_OP';
  targetId?: string;
  priority: number;
  metadata: Record<string, any>;
}

@Injectable()
export class SystemOptimizationService {
  private readonly CRITICAL_THRESHOLD = 0.85;
  private readonly IDLE_THRESHOLD = 0.20;
  private readonly LATENCY_TARGET_MS = 150;

  /**
   * Main optimization cycle.
   * Processes the current system state and returns a list of optimization actions.
   * Complexity: O(N) where N is number of resources.
   */
  public calculateOptimizations(state: OptimizationState): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    // 1. Critical Load Balancing (CPU/Memory)
    const overloadActions = this.evaluateResourceLoads(state.resources);
    actions.push(...overloadActions);

    // 2. Latency & Backpressure Optimization
    const performanceActions = this.evaluatePerformance(state.metrics);
    actions.push(...performanceActions);

    // 3. Resource Efficiency (Cost Optimization)
    if (actions.length === 0) {
      const efficiencyActions = this.evaluateEfficiency(state.resources, state.metrics);
      actions.push(...efficiencyActions);
    }

    return this.sortActionsByUrgency(actions);
  }

  private evaluateResourceLoads(resources: SystemResource[]): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    for (const res of resources) {
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

    // Check for high latency or backpressure
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

    // High error rate triggers cache flush or circuit breaker logic
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
    // Only optimize for efficiency if performance is stable
    if (metrics.latencyMs < this.LATENCY_TARGET_MS && metrics.errorRate < 0.01) {
      const lowLoadResources = resources.filter(r => r.currentLoad < 0.4);
      if (lowLoadResources.length > 2) {
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
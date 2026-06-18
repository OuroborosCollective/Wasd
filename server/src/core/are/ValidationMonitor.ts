/**
 * ValidationMonitor - Phase 12: Runtime Validation Statistics Monitoring
 * 
 * Provides monitoring endpoints and metrics for runtime validation statistics.
 * Integrates with server telemetry and exposes validation health.
 * 
 * @ARE-GUARD-EXEMPT: Monitoring metrics - not world-state input.
 */

import { runtimeValidation, getValidationTimestamp } from './RuntimeValidation.js';

// ─── Metrics Types ────────────────────────────────────────────────────────────

export interface ValidationMetrics {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  violationCount: number;
  dataFlowPaths: number;
  lastTickProcessed: number;
  passRate: number;
  errorRate: number;
}

export interface ValidationAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context?: string;
  timestamp: number;
  tickCount?: number;
}

// ─── Alert Thresholds ─────────────────────────────────────────────────────────

const ALERT_THRESHOLDS = {
  errorRateWarning: 0.05,      // 5% error rate triggers warning
  errorRateCritical: 0.15,     // 15% error rate triggers critical
  violationCountWarning: 50,    // 50 violations triggers warning
  violationCountCritical: 100,   // 100 violations triggers critical
  checkIntervalMs: 60000,       // Check every minute
};

// ─── Monitor Class ────────────────────────────────────────────────────────────

export class ValidationMonitor {
  private alerts: ValidationAlert[] = [];
  private maxAlerts = 100;
  private lastAlertCheck = 0;
  private alertCheckSequence = 0;
  private listeners: Set<(alert: ValidationAlert) => void> = new Set();

  /**
   * Get current validation metrics
   */
  getMetrics(): ValidationMetrics {
    const stats = runtimeValidation.getStats();
    const total = stats.totalValidations;
    const passed = stats.passedValidations;
    const failed = stats.failedValidations;

    return {
      totalValidations: total,
      passedValidations: passed,
      failedValidations: failed,
      violationCount: stats.violationCount,
      dataFlowPaths: stats.dataFlowPaths,
      lastTickProcessed: stats.lastTickProcessed,
      passRate: total > 0 ? passed / total : 1.0,
      errorRate: total > 0 ? failed / total : 0,
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50): ValidationAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get recent violations
   */
  getRecentViolations(limit = 50) {
    return runtimeValidation.getViolations(limit);
  }

  /**
   * Get data flow cache
   */
  getDataFlowPaths() {
    return runtimeValidation.getDataFlowCache();
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(): ValidationAlert[] {
    const metrics = this.getMetrics();
    const newAlerts: ValidationAlert[] = [];

    // Check error rate
    if (metrics.errorRate >= ALERT_THRESHOLDS.errorRateCritical) {
      newAlerts.push(this.createAlert(
        'critical',
        `Critical error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        'error-rate'
      ));
    } else if (metrics.errorRate >= ALERT_THRESHOLDS.errorRateWarning) {
      newAlerts.push(this.createAlert(
        'high',
        `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        'error-rate'
      ));
    }

    // Check violation count
    if (metrics.violationCount >= ALERT_THRESHOLDS.violationCountCritical) {
      newAlerts.push(this.createAlert(
        'critical',
        `Critical violation count: ${metrics.violationCount}`,
        'violation-count'
      ));
    } else if (metrics.violationCount >= ALERT_THRESHOLDS.violationCountWarning) {
      newAlerts.push(this.createAlert(
        'medium',
        `High violation count: ${metrics.violationCount}`,
        'violation-count'
      ));
    }

    // Add new alerts
    for (const alert of newAlerts) {
      this.addAlert(alert);
      this.notifyListeners(alert);
    }

    return newAlerts;
  }

  /**
   * Subscribe to alert notifications
   */
  subscribe(callback: (alert: ValidationAlert) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    runtimeValidation.clearStats();
    this.alerts = [];
  }

  /**
   * Get monitoring report
   */
  getReport(): {
    metrics: ValidationMetrics;
    alerts: ValidationAlert[];
    recentViolations: ReturnType<typeof runtimeValidation.getViolations>;
    dataFlowPaths: ReturnType<typeof runtimeValidation.getDataFlowCache>;
    timestamp: number;
  } {
    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      recentViolations: this.getRecentViolations(),
      dataFlowPaths: this.getDataFlowPaths(),
      timestamp: getValidationTimestamp(),
    };
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  private createAlert(
    severity: ValidationAlert['severity'],
    message: string,
    context?: string
  ): ValidationAlert {
    return {
      severity,
      message,
      context,
      timestamp: getValidationTimestamp(),
      tickCount: runtimeValidation.getStats().lastTickProcessed,
    };
  }

  private addAlert(alert: ValidationAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }
  }

  private notifyListeners(alert: ValidationAlert): void {
    for (const listener of this.listeners) {
      try {
        listener(alert);
      } catch (e) {
        console.error('[ValidationMonitor] Listener error:', e);
      }
    }
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const validationMonitor = new ValidationMonitor();

// ─── REST/WS Endpoint Helpers ──────────────────────────────────────────────────

/**
 * Format metrics for Prometheus-style metrics endpoint
 */
export function formatPrometheusMetrics(metrics: ValidationMetrics): string {
  const lines = [
    '# HELP validation_total Total number of validation checks',
    '# TYPE validation_total counter',
    `validation_total ${metrics.totalValidations}`,
    '',
    '# HELP validation_passed Number of passed validation checks',
    '# TYPE validation_passed counter',
    `validation_passed ${metrics.passedValidations}`,
    '',
    '# HELP validation_failed Number of failed validation checks',
    '# TYPE validation_failed counter',
    `validation_failed ${metrics.failedValidations}`,
    '',
    '# HELP validation_violations Number of recorded violations',
    '# TYPE validation_violations gauge',
    `validation_violations ${metrics.violationCount}`,
    '',
    '# HELP validation_pass_rate Pass rate (0-1)',
    '# TYPE validation_pass_rate gauge',
    `validation_pass_rate ${metrics.passRate.toFixed(4)}`,
    '',
    '# HELP validation_error_rate Error rate (0-1)',
    '# TYPE validation_error_rate gauge',
    `validation_error_rate ${metrics.errorRate.toFixed(4)}`,
  ];
  return lines.join('\n');
}

/**
 * Format metrics as JSON for REST endpoints
 */
export function formatJsonMetrics(metrics: ValidationMetrics): string {
  return JSON.stringify({
    validation: {
      total: metrics.totalValidations,
      passed: metrics.passedValidations,
      failed: metrics.failedValidations,
      violations: metrics.violationCount,
      dataFlowPaths: metrics.dataFlowPaths,
      lastTick: metrics.lastTickProcessed,
      passRate: Math.round(metrics.passRate * 10000) / 100,
      errorRate: Math.round(metrics.errorRate * 10000) / 100,
    },
    timestamp: getValidationTimestamp(),
  }, null, 2);
}

// ─── Automatic Monitoring Setup ───────────────────────────────────────────────

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start automatic validation monitoring
 */
export function startValidationMonitoring(
  intervalMs = ALERT_THRESHOLDS.checkIntervalMs
): void {
  if (monitorInterval) {
    console.warn('[ValidationMonitor] Already running');
    return;
  }

  monitorInterval = setInterval(() => {
    const newAlerts = validationMonitor.checkAlerts();
    if (newAlerts.length > 0) {
      console.warn('[ValidationMonitor] New alerts:', newAlerts);
    }
  }, intervalMs);

  console.log(`[ValidationMonitor] Started with ${intervalMs}ms interval`);
}

/**
 * Stop automatic validation monitoring
 */
export function stopValidationMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[ValidationMonitor] Stopped');
  }
}

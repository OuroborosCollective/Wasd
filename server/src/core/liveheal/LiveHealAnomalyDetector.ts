// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
/**
 * LiveHeal v2 - Anomaly Detector
 *
 * Local, lightweight anomaly detection using sliding windows,
 * exponential moving averages, and consecutive threshold violations.
 * No external ML dependencies.
 */

import type {
  AnomalyObservation,
  AnomalyConfig,
  MetricThresholds,
  HealthSnapshot,
} from "./LiveHealTypes.js";

interface SlidingWindow {
  values: number[];
  maxSize: number;
  ema: number;
  emaAlpha: number;
  /** Number of consecutive violations of the warning threshold */
  consecutiveWarning: number;
  /** Number of consecutive violations of the critical threshold */
  consecutiveCritical: number;
  lastAlertAt: number;
}

function createWindow(maxSize: number, emaAlpha: number): SlidingWindow {
  return {
    values: [],
    maxSize,
    ema: 0,
    emaAlpha,
    consecutiveWarning: 0,
    consecutiveCritical: 0,
    lastAlertAt: 0,
  };
}

function pushValue(w: SlidingWindow, value: number): void {
  w.values.push(value);
  if (w.values.length > w.maxSize) {
    w.values.shift();
  }
  // Update EMA
  w.ema = w.emaAlpha * value + (1 - w.emaAlpha) * w.ema;
}

interface SubsystemMetrics {
  tickDurationMs: SlidingWindow;
  queueDepth: SlidingWindow;
  errorRate: SlidingWindow;
  memoryUsageMb: SlidingWindow;
  reconnectRate: SlidingWindow;
  latencyMs: SlidingWindow;
}

function createSubsystemMetrics(windowSize: number): SubsystemMetrics {
  const alpha = 2 / (windowSize + 1); // standard EMA alpha
  return {
    tickDurationMs: createWindow(windowSize, alpha),
    queueDepth: createWindow(windowSize, alpha),
    errorRate: createWindow(windowSize, alpha),
    memoryUsageMb: createWindow(windowSize, alpha),
    reconnectRate: createWindow(windowSize, alpha),
    latencyMs: createWindow(windowSize, alpha),
  };
}

export class LiveHealAnomalyDetector {
  private readonly config: AnomalyConfig;
  private readonly thresholds: MetricThresholds;
  private readonly subsystemWindows = new Map<string, SubsystemMetrics>();

  constructor(config: AnomalyConfig, thresholds: MetricThresholds) {
    this.config = config;
    this.thresholds = thresholds;
  }

  /**
   * Feed a health snapshot into the detector. Returns any new anomalies.
   */
  observe(subsystemId: string, snapshot: HealthSnapshot): AnomalyObservation[] {
    let metrics = this.subsystemWindows.get(subsystemId);
    if (!metrics) {
      metrics = createSubsystemMetrics(this.config.windowSize);
      this.subsystemWindows.set(subsystemId, metrics);
    }

    const anomalies: AnomalyObservation[] = [];
    const now = Date.now();

    // Check each metric from the snapshot
    this.checkMetric(anomalies, subsystemId, metrics.tickDurationMs, "tickDurationMs",
      snapshot.metrics.tickDurationMs, now);
    this.checkMetric(anomalies, subsystemId, metrics.queueDepth, "queueDepth",
      snapshot.metrics.queueDepth, now);
    this.checkMetric(anomalies, subsystemId, metrics.errorRate, "errorRate",
      snapshot.metrics.errorRate, now);
    this.checkMetric(anomalies, subsystemId, metrics.memoryUsageMb, "memoryUsageMb",
      snapshot.metrics.memoryUsageMb, now);
    this.checkMetric(anomalies, subsystemId, metrics.reconnectRate, "reconnectRate",
      snapshot.metrics.reconnectRate, now);
    this.checkMetric(anomalies, subsystemId, metrics.latencyMs, "latencyMs",
      snapshot.metrics.latencyMs, now);

    return anomalies;
  }

  private checkMetric(
    anomalies: AnomalyObservation[],
    subsystemId: string,
    window: SlidingWindow,
    metricName: string,
    value: number | undefined,
    now: number
  ): void {
    if (value === undefined || value === null) {
      return;
    }

    pushValue(window, value);

    const thresholds = (this.thresholds as unknown as Record<string, { warning: number; critical: number }>)[metricName];
    if (!thresholds) {
      return;
    }

    // Check against EMA for smooth detection
    const ema = window.ema;

    if (ema > thresholds.critical) {
      window.consecutiveCritical += 1;
      window.consecutiveWarning = 0;
    } else if (ema > thresholds.warning) {
      window.consecutiveWarning += 1;
      window.consecutiveCritical = 0;
    } else {
      // Reset counters when below thresholds
      window.consecutiveWarning = 0;
      window.consecutiveCritical = 0;
    }

    // Alert on consecutive violations
    const required = this.config.consecutiveRequired;
    const isCritical = window.consecutiveCritical >= required;
    const isWarning = window.consecutiveWarning >= required;

    if (isCritical || isWarning) {
      // Respect alert cooldown
      if (now - window.lastAlertAt < this.config.alertCooldownMs) {
        return;
      }
      window.lastAlertAt = now;

      anomalies.push({
        subsystem: subsystemId,
        metric: metricName,
        value: ema,
        threshold: isCritical ? thresholds.critical : thresholds.warning,
        windowSize: window.values.length,
        consecutiveViolations: isCritical ? window.consecutiveCritical : window.consecutiveWarning,
        detectedAt: now,
      });
    }
  }

  /**
   * Get the current EMA for a specific metric of a subsystem.
   */
  getEma(subsystemId: string, metric: string): number | null {
    const metrics = this.subsystemWindows.get(subsystemId);
    if (!metrics) return null;
    const w = (metrics as unknown as Record<string, SlidingWindow>)[metric];
    return w?.ema ?? null;
  }

  /**
   * Get all tracked subsystems.
   */
  getTrackedSubsystems(): string[] {
    return Array.from(this.subsystemWindows.keys());
  }

  /**
   * Reset all windows for a subsystem (e.g. after successful recovery).
   */
  reset(subsystemId: string): void {
    this.subsystemWindows.delete(subsystemId);
  }

  /**
   * Reset all tracking data.
   */
  resetAll(): void {
    this.subsystemWindows.clear();
  }
}

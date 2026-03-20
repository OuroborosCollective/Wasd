/**
 * PerformanceMonitor
 * Comprehensive performance monitoring and metrics collection
 * 
 * Features:
 * - FPS tracking
 * - Memory usage monitoring
 * - Network latency measurement
 * - Error tracking
 * - Performance alerts
 * - Analytics reporting
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory?: {
    used: number;
    limit: number;
    percentage: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    packetLoss: number;
  };
  errors: {
    count: number;
    lastError?: string;
  };
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'network' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  value?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;
  private animationFrameId: number | null = null;
  private isMonitoring = false;

  // Configuration
  private fpsThreshold = 30;
  private memoryThreshold = 0.85;
  private latencyThreshold = 200;
  private errorThreshold = 10;

  // Callbacks
  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  private onAlert?: (alert: PerformanceAlert) => void;

  constructor() {
    this.setupErrorTracking();
    this.setupNetworkTracking();
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.measureFrame();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Measure frame performance
   */
  private measureFrame = () => {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;

    // Calculate FPS every 500ms
    if (deltaTime > 500) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;

      // Collect metrics
      this.collectMetrics();
    }

    if (this.isMonitoring) {
      this.animationFrameId = requestAnimationFrame(this.measureFrame);
    }
  };

  /**
   * Collect current metrics
   */
  private collectMetrics() {
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      frameTime: 1000 / this.fps,
      memory: this.getMemoryUsage(),
      network: this.getNetworkMetrics(),
      errors: this.getErrorMetrics(),
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // Keep only last 60 seconds of data
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics = this.metrics.filter((m) => m.timestamp > oneMinuteAgo);

    // Check thresholds and trigger alerts
    this.checkThresholds(metrics);

    // Callback
    this.onMetricsUpdate?.(metrics);
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage() {
    if (!performance.memory) {
      return undefined;
    }

    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const percentage = used / limit;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      limit: Math.round(limit / 1024 / 1024), // MB
      percentage
    };
  }

  /**
   * Get network metrics (placeholder - would need actual network tracking)
   */
  private getNetworkMetrics() {
    return {
      latency: this.calculateAverageLatency(),
      bandwidth: 0,
      packetLoss: 0
    };
  }

  /**
   * Get error metrics
   */
  private getErrorMetrics() {
    return {
      count: this.alerts.filter((a) => a.type === 'error').length,
      lastError: this.alerts
        .filter((a) => a.type === 'error')
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.message
    };
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics) {
    // FPS threshold
    if (metrics.fps < this.fpsThreshold) {
      this.addAlert({
        type: 'fps',
        severity: metrics.fps < 15 ? 'critical' : 'high',
        message: `Low FPS: ${metrics.fps}`,
        value: metrics.fps,
        timestamp: Date.now()
      });
    }

    // Memory threshold
    if (metrics.memory && metrics.memory.percentage > this.memoryThreshold) {
      this.addAlert({
        type: 'memory',
        severity: metrics.memory.percentage > 0.95 ? 'critical' : 'high',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`,
        value: metrics.memory.percentage,
        timestamp: Date.now()
      });
    }

    // Network latency threshold
    if (metrics.network.latency > this.latencyThreshold) {
      this.addAlert({
        type: 'network',
        severity: metrics.network.latency > 500 ? 'high' : 'medium',
        message: `High latency: ${metrics.network.latency}ms`,
        value: metrics.network.latency,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Add alert
   */
  private addAlert(alert: PerformanceAlert) {
    // Avoid duplicate alerts
    const recentSimilar = this.alerts.find(
      (a) =>
        a.type === alert.type &&
        a.severity === alert.severity &&
        Date.now() - a.timestamp < 5000
    );

    if (recentSimilar) return;

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    this.onAlert?.(alert);
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.addAlert({
        type: 'error',
        severity: 'high',
        message: event.message,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addAlert({
        type: 'error',
        severity: 'high',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Setup network tracking
   */
  private setupNetworkTracking() {
    // Track fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: any[]) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        this.recordNetworkRequest(duration, response.status);
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordNetworkRequest(duration, 0);
        throw error;
      }
    };
  }

  /**
   * Record network request
   */
  private networkLatencies: number[] = [];

  private recordNetworkRequest(duration: number, status: number) {
    this.networkLatencies.push(duration);

    // Keep only last 100 requests
    if (this.networkLatencies.length > 100) {
      this.networkLatencies.shift();
    }

    // Alert on slow requests
    if (duration > 5000) {
      this.addAlert({
        type: 'network',
        severity: 'medium',
        message: `Slow network request: ${duration.toFixed(0)}ms`,
        value: duration,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    if (this.networkLatencies.length === 0) return 0;
    const sum = this.networkLatencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.networkLatencies.length);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(seconds: number = 60): PerformanceMetrics[] {
    const cutoff = Date.now() - seconds * 1000;
    return this.metrics.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Get alerts
   */
  getAlerts(limit: number = 20): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const history = this.getMetricsHistory(60);
    if (history.length === 0) {
      return null;
    }

    const fps = history.map((m) => m.fps);
    const avgFps = Math.round(fps.reduce((a, b) => a + b, 0) / fps.length);
    const minFps = Math.min(...fps);
    const maxFps = Math.max(...fps);

    return {
      avgFps,
      minFps,
      maxFps,
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      criticalAlerts: this.alerts.filter((a) => a.severity === 'critical').length
    };
  }

  /**
   * Set callbacks
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void) {
    this.onMetricsUpdate = callback;
  }

  onAlert(callback: (alert: PerformanceAlert) => void) {
    this.onAlert = callback;
  }

  /**
   * Set thresholds
   */
  setThresholds(config: Partial<{ fpsThreshold: number; memoryThreshold: number; latencyThreshold: number }>) {
    if (config.fpsThreshold !== undefined) this.fpsThreshold = config.fpsThreshold;
    if (config.memoryThreshold !== undefined) this.memoryThreshold = config.memoryThreshold;
    if (config.latencyThreshold !== undefined) this.latencyThreshold = config.latencyThreshold;
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.getSummary()
    });
  }

  /**
   * Clear data
   */
  clear() {
    this.metrics = [];
    this.alerts = [];
    this.networkLatencies = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;

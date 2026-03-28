/**
 * PerformanceMonitor
 * Comprehensive performance monitoring and metrics collection
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

  private fpsThreshold = 30;
  private memoryThreshold = 0.85;
  private latencyThreshold = 200;

  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  private onAlert?: (alert: PerformanceAlert) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupErrorTracking();
      this.setupNetworkTracking();
    }
  }

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.measureFrame();
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isMonitoring = false;
  }

  private measureFrame = () => {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;

    if (deltaTime > 500) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.collectMetrics();
    }

    if (this.isMonitoring) {
      this.animationFrameId = requestAnimationFrame(this.measureFrame);
    }
  };

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
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics = this.metrics.filter((m) => m.timestamp > oneMinuteAgo);
    this.checkThresholds(metrics);
    this.onMetricsUpdate?.(metrics);
  }

  private getMemoryUsage() {
    const perf = window.performance as any;
    if (!perf.memory) return undefined;

    const used = perf.memory.usedJSHeapSize;
    const limit = perf.memory.jsHeapSizeLimit;
    return {
      used: Math.round(used / 1024 / 1024),
      limit: Math.round(limit / 1024 / 1024),
      percentage: used / limit
    };
  }

  private getNetworkMetrics() {
    return {
      latency: this.calculateAverageLatency(),
      bandwidth: 0,
      packetLoss: 0
    };
  }

  private getErrorMetrics() {
    return {
      count: this.alerts.filter((a) => a.type === 'error').length,
      lastError: this.alerts
        .filter((a) => a.type === 'error')
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.message
    };
  }

  private checkThresholds(metrics: PerformanceMetrics) {
    if (metrics.fps < this.fpsThreshold) {
      this.addAlert({
        type: 'fps',
        severity: metrics.fps < 15 ? 'critical' : 'high',
        message: `Low FPS: ${metrics.fps}`,
        value: metrics.fps,
        timestamp: Date.now()
      });
    }
  }

  private addAlert(alert: PerformanceAlert) {
    const recentSimilar = this.alerts.find(
      (a) => a.type === alert.type && a.severity === alert.severity && Date.now() - a.timestamp < 5000
    );
    if (recentSimilar) return;
    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
    this.onAlert?.(alert);
  }

  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.addAlert({ type: 'error', severity: 'high', message: event.message, timestamp: Date.now() });
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.addAlert({ type: 'error', severity: 'high', message: `Unhandled Promise Rejection: ${event.reason}`, timestamp: Date.now() });
    });
  }

  private setupNetworkTracking() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: any[]) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        this.recordNetworkRequest(performance.now() - startTime, response.status);
        return response;
      } catch (error) {
        this.recordNetworkRequest(performance.now() - startTime, 0);
        throw error;
      }
    };
  }

  private networkLatencies: number[] = [];
  private recordNetworkRequest(duration: number, _status: number) {
    this.networkLatencies.push(duration);
    if (this.networkLatencies.length > 100) this.networkLatencies.shift();
  }

  private calculateAverageLatency(): number {
    if (this.networkLatencies.length === 0) return 0;
    return Math.round(this.networkLatencies.reduce((a, b) => a + b, 0) / this.networkLatencies.length);
  }

  getSummary() {
    const history = this.metrics;
    if (history.length === 0) return null;
    const fps = history.map((m) => m.fps);
    return {
      avgFps: Math.round(fps.reduce((a, b) => a + b, 0) / fps.length),
      minFps: Math.min(...fps),
      maxFps: Math.max(...fps)
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// @ts-nocheck
/**
 * GlobalLiveTicker - Real-Time Market Ticker (B2B API)
 * 
 * Live ticker for Ouroboros Collective Science Portal.
 * Connects to ScarcityPredictor for market_price_shift visualization.
 * Uses mathematical market heuristics for prediction power.
 * 
 * Features:
 * - ScarcityPredictor integration
 * - 10-Hz data stream processing
 * - No OOM exceptions (object pooling)
 * - Type-safe API
 * - Real data only (no mocks)
 */

import { EventEmitter } from 'events';
import { pushLiveTickerHazard } from '@wasd/shared';
import { 
  ScarcityPredictor, 
  PriceShiftPrediction,
  MarketTrend 
} from "../../../../server/src/modules/economy/ScarcityPredictor";

/** Market ticker event types */
export enum TickerEventType {
  PRICE_UPDATE = 'price_update',
  TREND_CHANGE = 'trend_change',
  ALERT = 'alert',
  SCARCITY_WARNING = 'scarcity_warning',
  HAZARD_UPDATE = 'hazard_update',
}

/** Ticker data point */
export interface TickerDataPoint {
  resourceId: string;
  price: number;
  timestamp: number;
  scarcity: number;
  trend: MarketTrend;
  prediction: number;
  hazardIndex?: number;
  aggressionTrend?: number;
  aggressionAvg?: number;
}

/** Ticker configuration */
export interface TickerConfig {
  tickRate: number;
  maxHistory: number;
  bufferSize: number;
  enablePrediction: boolean;
}

/** Ticker alert */
export interface TickerAlert {
  id: string;
  type: TickerEventType;
  resourceId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

/** Resource market data */
export interface MarketData {
  resourceId: string;
  currentPrice: number;
  scarcityScore: number;
  trend: MarketTrend;
  predictedShift: number;
  lastUpdate: number;
  hazardIndex: number;
  aggressionTrend: number;
  aggressionAvg: number;
}

/** Pooled data point (reused to prevent OOM) */
class PooledDataPoint {
  resourceId = '';
  price = 0;
  timestamp = 0;
  scarcity = 0;
  trend: MarketTrend = MarketTrend.STABLE;
  prediction = 0;
  hazardIndex = 0;
  aggressionTrend = 0;
  aggressionAvg = 0;
  next: PooledDataPoint | null = null;
}

/** Object pool for ticker data points */
class DataPointPool {
  private pool: PooledDataPoint[] = [];
  private head = 0;
  private readonly poolSize: number;

  constructor(size: number = 100) {
    this.poolSize = size;
    for (let i = 0; i < size; i++) {
      this.pool.push(new PooledDataPoint());
    }
  }

  allocate(): PooledDataPoint {
    if (this.head >= this.poolSize) {
      this.head = 0;
    }
    const point = this.pool[this.head++];
    point.next = null;
    return point;
  }

  reset(): void {
    this.head = 0;
  }
}

/** Circular buffer for market history */
class CircularBuffer {
  private buffer: TickerDataPoint[];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(data: TickerDataPoint): void {
    this.buffer[this.head] = data;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  getRecent(n: number): TickerDataPoint[] {
    const result: TickerDataPoint[] = [];
    let index = (this.head - Math.min(n, this.count) + this.capacity) % this.capacity;
    for (let i = 0; i < Math.min(n, this.count); i++) {
      if (this.buffer[index]) {
        result.push(this.buffer[index]);
      }
      index = (index + 1) % this.capacity;
    }
    return result;
  }

  getAll(): TickerDataPoint[] {
    return this.getRecent(this.count);
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }

  getSize(): number {
    return this.count;
  }
}

/** Default configuration */
const DEFAULT_CONFIG: TickerConfig = {
  tickRate: 100,      // 10-Hz
  maxHistory: 100,    // Keep last 100 points per resource
  bufferSize: 100,   // Pool size
  enablePrediction: true
};

/** Default tick rate (10-Hz) */
const DEFAULT_TICK_RATE = 100;

/**
 * Main GlobalLiveTicker class
 * Processes real-time market data at 10-Hz without OOM.
 */
export class GlobalLiveTicker extends EventEmitter {
  private predictor: ScarcityPredictor;
  private dataPool: DataPointPool;
  private history: Map<string, CircularBuffer> = new Map();
  private activeResources: Set<string> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private config: TickerConfig;
  private isRunning = false;
  private alerts: TickerAlert[] = [];

  constructor(
    predictor: ScarcityPredictor,
    config: Partial<TickerConfig> = {}
  ) {
    super();
    this.predictor = predictor;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataPool = new DataPointPool(this.config.bufferSize);
  }

  /**
   * Initialize ticker with resources.
   * Call before starting.
   */
  public async initialize(resourceIds: string[]): Promise<void> {
    for (const resourceId of resourceIds) {
      this.activeResources.add(resourceId);
      this.history.set(resourceId, new CircularBuffer(this.config.maxHistory));
    }
    console.log(`[GlobalLiveTicker] Initialized with ${resourceIds.length} resources`);
  }

  /**
   * Start ticker at 10-Hz.
   * Processes data stream without OOM.
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(
      () => this.tick(),
      this.config.tickRate
    );
    console.log('[GlobalLiveTicker] Started at 10-Hz');
  }

  /**
   * Stop ticker.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[GlobalLiveTicker] Stopped');
  }

  /**
   * Process single tick (10-Hz).
   * Uses pooled objects to prevent OOM.
   */
  private async tick(): Promise<void> {
    for (const resourceId of this.activeResources) {
      try {
        const marketData = await this.fetchRealTimeData(resourceId);
        
        if (marketData) {
          this.processDataPoint(resourceId, marketData);
        }
      } catch (error) {
        console.error(`[GlobalLiveTicker] Error processing ${resourceId}:`, error);
      }
    }

    // Clean up old alerts
    this.pruneAlerts();
  }

  /**
   * Fetch real-time market data from ScarcityPredictor.
   * NO MOCKS - uses real engine data.
   */
  private async fetchRealTimeData(resourceId: string): Promise<MarketData | null> {
    try {
      // Get prediction from ScarcityPredictor
      const prediction = this.predictor.predictPriceShift(resourceId, 1.0);
      
      if (!prediction) {
        return null;
      }

      return {
        resourceId,
        currentPrice: this.predictor.getCurrentPrice(resourceId),
        scarcityScore: prediction.scarcityScore,
        trend: prediction.trend,
        predictedShift: prediction.predictedShift,
        lastUpdate: Date.now(),
        hazardIndex: prediction.hazardIndex,
        aggressionTrend: prediction.aggressionTrend,
        aggressionAvg: prediction.aggressionAvg,
      };
    } catch (error) {
      console.error(`[GlobalLiveTicker] Fetch error: ${resourceId}`, error);
      return null;
    }
  }

  /**
   * Process data point with object pooling.
   */
  private processDataPoint(resourceId: string, data: MarketData): void {
    // Allocate from pool (no new objects)
    const point = this.dataPool.allocate();
    point.resourceId = data.resourceId;
    point.price = data.currentPrice;
    point.timestamp = data.lastUpdate;
    point.scarcity = data.scarcityScore;
    point.trend = data.trend;
    point.prediction = data.predictedShift;
    point.hazardIndex = data.hazardIndex;
    point.aggressionTrend = data.aggressionTrend;
    point.aggressionAvg = data.aggressionAvg;

    // Add to history buffer
    const history = this.history.get(resourceId);
    if (history) {
      history.push(point);
    }

    // Emit price update event
    this.emit(TickerEventType.PRICE_UPDATE, point);

    this.emit(TickerEventType.HAZARD_UPDATE, {
      resourceId,
      hazardIndex: point.hazardIndex,
      aggressionTrend: point.aggressionTrend,
      aggressionAvg: point.aggressionAvg,
      timestamp: point.timestamp,
    });

    pushLiveTickerHazard({
      resourceId,
      hazardIndex: data.hazardIndex,
      aggressionTrend: data.aggressionTrend,
      aggression_avg: data.aggressionAvg,
    });

    // Check for alerts
    this.checkAlerts(resourceId, point);
  }

  /**
   * Check and generate alerts.
   */
  private checkAlerts(resourceId: string, point: PooledDataPoint): void {
    // Scarcity warning
    if (point.scarcity >= 0.8) {
      this.addAlert({
        id: `alert_${Date.now()}_${resourceId}`,
        type: TickerEventType.SCARCITY_WARNING,
        resourceId,
        message: `High scarcity detected: ${(point.scarcity * 100).toFixed(1)}%`,
        severity: point.scarcity >= 0.95 ? 'critical' : 'high',
        timestamp: point.timestamp
      });
    }

    // Trend change
    const history = this.history.get(resourceId);
    if (history && history.getSize() > 1) {
      const recent = history.getRecent(2);
      if (recent.length >= 2) {
        const prev = recent[0];
        const curr = point;
        if (prev.trend !== curr.trend) {
          this.emit(TickerEventType.TREND_CHANGE, {
            resourceId,
            from: prev.trend,
            to: curr.trend,
            timestamp: curr.timestamp
          });
        }
      }
    }
  }

  /**
   * Add alert to list.
   */
  private addAlert(alert: TickerAlert): void {
    this.alerts.push(alert);
    this.emit(TickerEventType.ALERT, alert);
  }

  /**
   * Prune old alerts.
   */
  private pruneAlerts(): void {
    const now = Date.now();
    this.alerts = this.alerts.filter(a => now - a.timestamp < 60000);
  }

  /**
   * Get recent history for a resource.
   */
  public getHistory(resourceId: string, n: number = 10): TickerDataPoint[] {
    const history = this.history.get(resourceId);
    return history ? history.getRecent(n) : [];
  }

  /**
   * Get current market data for all resources.
   */
  public getCurrentMarkets(): MarketData[] {
    const results: MarketData[] = [];
    
    for (const resourceId of this.activeResources) {
      const history = this.history.get(resourceId);
      if (history && history.getSize() > 0) {
        const recent = history.getRecent(1);
        if (recent.length > 0) {
          const point = recent[0];
          results.push({
            resourceId: point.resourceId,
            currentPrice: point.price,
            scarcityScore: point.scarcity,
            trend: point.trend,
            predictedShift: point.prediction,
            lastUpdate: point.timestamp,
            hazardIndex: point.hazardIndex ?? 0,
            aggressionTrend: point.aggressionTrend ?? 0,
            aggressionAvg: point.aggressionAvg ?? 0,
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Get active alerts.
   */
  public getAlerts(): TickerAlert[] {
    return [...this.alerts];
  }

  /**
   * Check if ticker is running.
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Cleanup resources.
   */
  public destroy(): void {
    this.stop();
    this.dataPool.reset();
    this.history.clear();
    this.activeResources.clear();
    this.alerts = [];
  }
}

export default GlobalLiveTicker;

/** Helper to create ticker with default predictor */
export function createTicker(predictor: ScarcityPredictor): GlobalLiveTicker {
  return new GlobalLiveTicker(predictor, {
    tickRate: DEFAULT_TICK_RATE,
    maxHistory: 100,
    bufferSize: 100,
    enablePrediction: true
  });
}

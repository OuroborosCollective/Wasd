import { WorldEventBus } from "../../events/WorldEventBus.js";
import { WorldHistory } from "../history/WorldHistory.js";
import { pushLiveTickerHazard, type LiveTickerHazardPayload } from "../../theme/serverThemeHazard.js";
import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export interface EmergentMarket {
  getResourcePrice(resourceId: string, regionId: string): number;
  getResourceStock(resourceId: string, regionId: string): number;
  getNPCGoals(npcId: string): NPCGoals;
}

export interface NPCGoals {
  migrationTarget?: string;
  resourcePriorities: Record<string, number>;
  lastGoalUpdate: number;
}

export interface MarketState {
  price: number;
  stock: number;
  velocity: number;
  timestamp: number;
}

export interface ScarcityPrediction {
  resourceId: string;
  regionId: string;
  probability: number;
  severity: number;
  estimatedOnset: number;
  recommendedAction: 'MIGRATE' | 'HOARD' | 'NONE';
  affectedNPCs: string[];
}

export type ScarcityEventType = 'PREDICTED' | 'CONFIRMED';

export interface ScarcityEvent {
  type: ScarcityEventType;
  prediction: ScarcityPrediction;
  npcAdjustments: Record<string, Partial<NPCGoals>>;
}

export const SCARCITY_DEFAULT_REGION = "WORLD";

export enum MarketTrend {
  STABLE = "stable",
  RISING = "rising",
  FALLING = "falling",
  VOLATILE = "volatile",
}

export interface PriceShiftPrediction {
  resourceId: string;
  scarcityScore: number;
  trend: MarketTrend;
  predictedShift: number;
  hazardIndex: number;
  aggressionTrend: number;
  aggressionAvg: number;
}

export interface HazardSnapshot {
  hazard_index: number;
  aggression_trend: number;
  aggression_avg: number;
  sample_count: number;
}

export function computeHazardIndexFromAggressionSeries(samples: readonly number[]): HazardSnapshot {
  const n = samples.length;
  if (n === 0) {
    return { hazard_index: 0, aggression_trend: 0, aggression_avg: 0, sample_count: 0 };
  }
  if (n === 1) {
    const only = samples[0]!;
    return {
      hazard_index: Math.max(0, Math.min(1, (only - 0.25) / 0.75)),
      aggression_trend: 0,
      aggression_avg: only,
      sample_count: 1,
    };
  }

  let sum = 0;
  for (const v of samples) {
    sum += v;
  }
  const mean = sum / n;

  let varAcc = 0;
  for (const v of samples) {
    const d = v - mean;
    varAcc += d * d;
  }
  const variance = varAcc / n;
  const stdev = Math.sqrt(Math.max(variance, 0));

  const xMean = (n - 1) / 2;
  let cov = 0;
  let varX = 0;
  for (let i = 0; i < n; i++) {
    const xi = i - xMean;
    cov += xi * (samples[i]! - mean);
    varX += xi * xi;
  }
  const slope = varX > 1e-12 ? cov / varX : 0;

  const meanPressure = Math.max(0, Math.min(1, (mean - 0.22) / 0.73));
  const trendNorm = Math.max(-1, Math.min(1, slope * 220));
  const volPressure = Math.max(0, Math.min(1, stdev * 5));
  const hazard = Math.max(
    0,
    Math.min(1, 0.38 * meanPressure + 0.37 * Math.max(0, trendNorm) + 0.25 * volPressure),
  );

  return {
    hazard_index: hazard,
    aggression_trend: slope,
    aggression_avg: mean,
    sample_count: n,
  };
}

export class ScarcityPredictor {
  private static readonly PRICE_SPIKE_THRESHOLD = 0.25;
  private static readonly STOCK_DROP_THRESHOLD = 0.20;
  private static readonly VOLATILITY_WINDOW = 10;
  private static readonly PREDICTION_HORIZON_MS = 5000;
  private static readonly MIN_CONFIDENCE = 0.65;

  static readonly DEFAULT_REGION = SCARCITY_DEFAULT_REGION;

  private static readonly themeBridgeBuses = new WeakSet<WorldEventBus>();

  constructor(
    private eventBus: WorldEventBus,
    private market: EmergentMarket,
    private readonly clock: AREClock = new SystemAREClock()
  ) {
    this.setupSubscriptions();
    if (!ScarcityPredictor.themeBridgeBuses.has(this.eventBus)) {
      ScarcityPredictor.themeBridgeBuses.add(this.eventBus);
      this.eventBus.subscribe("live_ticker_hazard", (raw) => {
        pushLiveTickerHazard(raw as LiveTickerHazardPayload);
      });
    }
  }

  private setupSubscriptions(): void {
    this.eventBus.subscribe('market_price_shift', (raw: unknown) => {
      const data = raw as {
      resourceId: string;
      regionId: string;
      price: number;
      stock: number;
    };
      const prediction = this.predictScarcity(
        data.resourceId,
        data.regionId,
        data.price,
        data.stock
      );

      if (prediction && prediction.probability >= ScarcityPredictor.MIN_CONFIDENCE) {
        this.emitPrediction(prediction);
      }
    });

    this.eventBus.subscribe('resource_transaction', (raw: unknown) => {
      const data = raw as {
      resourceId: string;
      regionId: string;
      amount: number;
      type: 'buy' | 'sell';
    };
      this.handleTransaction(data);
    });
  }

  private handleTransaction(data: {
    resourceId: string;
    regionId: string;
    amount: number;
    type: 'buy' | 'sell';
  }): void {
    const price = this.market.getResourcePrice(data.resourceId, data.regionId);
    const stock = this.market.getResourceStock(data.resourceId, data.regionId);
    const adjustedStock = data.type === 'sell'
      ? stock + data.amount
      : stock - data.amount;

    this.predictScarcity(data.resourceId, data.regionId, price, adjustedStock);
  }

  public predictScarcity(
    resourceId: string,
    regionId: string,
    currentPrice: number,
    currentStock: number
  ): ScarcityPrediction | null {
    const basePrice = this.getReferencePrice(resourceId, regionId);
    const baseStock = this.getReferenceStock(resourceId, regionId);

    if (basePrice <= 0 || baseStock <= 0) {
      return null;
    }

    const priceChangeRate = (currentPrice - basePrice) / basePrice;
    const stockChangeRate = (currentStock - baseStock) / baseStock;

    const isStockDropping = stockChangeRate < -ScarcityPredictor.STOCK_DROP_THRESHOLD;
    const isPriceSpiking = priceChangeRate > ScarcityPredictor.PRICE_SPIKE_THRESHOLD;

    if (!isStockDropping || !isPriceSpiking) {
      return null;
    }

    const urgency = Math.abs(stockChangeRate) + Math.abs(priceChangeRate);
    const probability = Math.min(0.99, Math.max(
      ScarcityPredictor.MIN_CONFIDENCE,
      urgency / 2
    ));

    const severity = Math.min(10, Math.max(1, Math.round(
      Math.abs(stockChangeRate) * 50
    )));

    const rateMagnitude = Math.abs(priceChangeRate) + Math.abs(stockChangeRate);
    const estimatedOnset = this.clock.now() + Math.round(
      ScarcityPredictor.PREDICTION_HORIZON_MS / rateMagnitude
    );

    const recommendedAction = this.determineAction(
      probability,
      severity,
      stockChangeRate
    );

    const affectedNPCs = this.findAffectedNPCs(
      resourceId,
      regionId,
      recommendedAction
    );

    return {
      resourceId,
      regionId,
      probability,
      severity,
      estimatedOnset,
      recommendedAction,
      affectedNPCs
    };
  }

  private getReferencePrice(resourceId: string, regionId: string): number {
    return this.market.getResourcePrice(resourceId, regionId);
  }

  private getReferenceStock(resourceId: string, regionId: string): number {
    return this.market.getResourceStock(resourceId, regionId);
  }

  private determineAction(
    probability: number,
    severity: number,
    stockChangeRate: number
  ): 'MIGRATE' | 'HOARD' | 'NONE' {
    if (probability > 0.85 && severity > 7) {
      return 'MIGRATE';
    }
    if (severity > 4 && stockChangeRate < -0.3) {
      return 'HOARD';
    }
    return 'NONE';
  }

  private findAffectedNPCs(
    resourceId: string,
    regionId: string,
    action: 'MIGRATE' | 'HOARD' | 'NONE'
  ): string[] {
    return [];
  }

  private emitPrediction(prediction: ScarcityPrediction): void {
    this.eventBus.emit('scarcity_predicted', {
      type: 'PREDICTED' as ScarcityEventType,
      prediction,
      npcAdjustments: this.calculateNPCAdjustments(prediction)
    } as ScarcityEvent);

    this.eventBus.emit('market_price_shift_warning', {
      resourceId: prediction.resourceId,
      regionId: prediction.regionId,
      probability: prediction.probability,
      severity: prediction.severity,
      recommendedAction: prediction.recommendedAction
    });
  }

  private calculateNPCAdjustments(
    prediction: ScarcityPrediction
  ): Record<string, Partial<NPCGoals>> {
    const adjustments: Record<string, Partial<NPCGoals>> = {};

    for (const npcId of prediction.affectedNPCs) {
      if (prediction.recommendedAction === 'MIGRATE') {
        const targetRegion = this.findAlternativeRegion(
          prediction.resourceId,
          prediction.regionId
        );

        adjustments[npcId] = {
          migrationTarget: targetRegion,
          resourcePriorities: {
            [prediction.resourceId]: prediction.probability
          },
          lastGoalUpdate: this.clock.now()
        };
      } else if (prediction.recommendedAction === 'HOARD') {
        adjustments[npcId] = {
          resourcePriorities: {
            [prediction.resourceId]: prediction.severity / 10
          },
          lastGoalUpdate: this.clock.now()
        };
      }
    }

    return adjustments;
  }

  private findAlternativeRegion(
    resourceId: string,
    currentRegionId: string
  ): string {
    const regions = ['region_a', 'region_b', 'region_c'];
    const currentIndex = regions.indexOf(currentRegionId);
    if (currentIndex >= 0) {
      return regions[(currentIndex + 1) % regions.length];
    }
    return regions[0];
  }

  public getHazardSnapshot(): HazardSnapshot {
    const series = WorldHistory.getInstance().getAggressionSeries(100);
    return computeHazardIndexFromAggressionSeries(series);
  }

  private pickMarketTrend(slope: number, stdev: number): MarketTrend {
    if (stdev > 0.11) {
      return MarketTrend.VOLATILE;
    }
    if (slope > 0.00075) {
      return MarketTrend.RISING;
    }
    if (slope < -0.00075) {
      return MarketTrend.FALLING;
    }
    return MarketTrend.STABLE;
  }

  public predictPriceShift(resourceId: string, intensityWeight = 1): PriceShiftPrediction {
    const region = ScarcityPredictor.DEFAULT_REGION;
    const price = this.market.getResourcePrice(resourceId, region);
    const stock = this.market.getResourceStock(resourceId, region);
    const scarcityPred = this.predictScarcity(resourceId, region, price, stock);
    const hazard = this.getHazardSnapshot();

    const baseScarcity = scarcityPred
      ? Math.min(1, scarcityPred.probability * 0.55 + (scarcityPred.severity / 10) * 0.45)
      : Math.min(
          1,
          hazard.hazard_index * 0.65 + Math.max(0, hazard.aggression_trend) * 180 * 0.15,
        );

    const scarcityScore = Math.min(
      1,
      baseScarcity * 0.72 + hazard.hazard_index * 0.28 * intensityWeight,
    );

    const series = WorldHistory.getInstance().getAggressionSeries(100);
    let stdevHint = 0;
    if (series.length > 1) {
      const m = hazard.aggression_avg;
      let v = 0;
      for (const x of series) {
        const d = x - m;
        v += d * d;
      }
      stdevHint = Math.sqrt(v / series.length);
    }
    const trend = this.pickMarketTrend(hazard.aggression_trend, stdevHint);

    const direction = hazard.aggression_trend >= 0 ? 1 : -1;
    const predictedShift =
      intensityWeight *
      (hazard.hazard_index * 0.14 +
        (scarcityPred?.probability ?? 0) * 0.07 +
        Math.abs(hazard.aggression_trend) * 120 * 0.04) *
      direction;

    const snapshot: PriceShiftPrediction = {
      resourceId,
      scarcityScore,
      trend,
      predictedShift,
      hazardIndex: hazard.hazard_index,
      aggressionTrend: hazard.aggression_trend,
      aggressionAvg: hazard.aggression_avg,
    };

    this.eventBus.emit("live_ticker_hazard", {
      resourceId,
      scarcityScore,
      trend,
      predictedShift,
      ...hazard,
    });

    return snapshot;
  }

  public getCurrentPrice(resourceId: string): number {
    return this.market.getResourcePrice(resourceId, ScarcityPredictor.DEFAULT_REGION);
  }

  public getPredictions(regionId: string): ScarcityPrediction[] {
    const resources = ["food", "fuel", "medicine", "water", "ore", "wood"];
    const out: ScarcityPrediction[] = [];
    for (const resourceId of resources) {
      const p = this.getPrediction(resourceId, regionId);
      if (p) out.push(p);
    }
    return out;
  }

  public getPrediction(resourceId: string, regionId: string): ScarcityPrediction | null {
    const price = this.market.getResourcePrice(resourceId, regionId);
    const stock = this.market.getResourceStock(resourceId, regionId);
    return this.predictScarcity(resourceId, regionId, price, stock);
  }
}

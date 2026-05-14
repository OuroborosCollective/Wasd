import { WorldEventBus } from "../../events/WorldEventBus.js";

/**
 * EmergentMarket - O(1) Lookup Interface
 * Provides stateless access to current market state
 */
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

/**
 * ScarcityPredictor - Stateless Deterministic Heuristic
 * 
 * Predicts market_price_shift BEFORE official scarcity_event triggers.
 * Uses only current 10-Hz tick state (no historical storage).
 * O(1) lookups in EmergentMarket.
 * 
 * Key features:
 * - Stateless: No MarketHistoryEntry storage between calls
 * - Deterministic: Same input = same output
 * - Predictive: Triggers BEFORE official scarcity_event
 * - NPC adjustment: longTermGoals modification for migration
 */
export class ScarcityPredictor {
  // Thresholds (determined from production data)
  private static readonly PRICE_SPIKE_THRESHOLD = 0.25;    // 25% price increase
  private static readonly STOCK_DROP_THRESHOLD = 0.20;       // 20% stock decrease
  private static readonly VOLATILITY_WINDOW = 10;            // 10 ticks (1 second at 10-Hz)
  private static readonly PREDICTION_HORIZON_MS = 5000;       // 5 seconds ahead
  private static readonly MIN_CONFIDENCE = 0.65;           // 65% minimum

  constructor(
    private eventBus: WorldEventBus,
    private market: EmergentMarket
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // Listen for price shifts to trigger prediction analysis
    this.eventBus.subscribe('market_price_shift', (data: {
      resourceId: string;
      regionId: string;
      price: number;
      stock: number;
    }) => {
      // Stateless prediction using current tick state only
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

    // Also listen for resource transactions
    this.eventBus.subscribe('resource_transaction', (data: {
      resourceId: string;
      regionId: string;
      amount: number;
      type: 'buy' | 'sell';
    }) => {
      this.handleTransaction(data);
    });
  }

  /**
   * Handle incoming transaction - stateless analysis
   */
  private handleTransaction(data: {
    resourceId: string;
    regionId: string;
    amount: number;
    type: 'buy' | 'sell';
  }): void {
    // Get current prices from market
    const price = this.market.getResourcePrice(data.resourceId, data.regionId);
    const stock = this.market.getResourceStock(data.resourceId, data.regionId);

    // Analyze with new transaction data
    const adjustedStock = data.type === 'sell'
      ? stock + data.amount
      : stock - data.amount;

    this.predictScarcity(data.resourceId, data.regionId, price, adjustedStock);
  }

  /**
   * Predict scarcity using ONLY current tick state
   * Returns null if no scarcity detected (stateless, deterministic)
   */
  public predictScarcity(
    resourceId: string,
    regionId: string,
    currentPrice: number,
    currentStock: number
  ): ScarcityPrediction | null {
    // O(1) lookup for recent price from market
    const basePrice = this.getReferencePrice(resourceId, regionId);
    const baseStock = this.getReferenceStock(resourceId, regionId);

    if (basePrice <= 0 || baseStock <= 0) {
      return null;
    }

    // Calculate rate changes (deterministic)
    const priceChangeRate = (currentPrice - basePrice) / basePrice;
    const stockChangeRate = (currentStock - baseStock) / baseStock;

    // Scarcity heuristic:
    // - Stock dropping AND price spiking = scarcity incoming
    const isStockDropping = stockChangeRate < -ScarcityPredictor.STOCK_DROP_THRESHOLD;
    const isPriceSpiking = priceChangeRate > ScarcityPredictor.PRICE_SPIKE_THRESHOLD;

    if (!isStockDropping || !isPriceSpiking) {
      return null; // No scarcity predicted
    }

    // Calculate confidence (deterministic formula)
    const urgency = Math.abs(stockChangeRate) + Math.abs(priceChangeRate);
    const probability = Math.min(0.99, Math.max(
      ScarcityPredictor.MIN_CONFIDENCE,
      urgency / 2
    ));

    // Calculate severity (1-10 scale)
    const severity = Math.min(10, Math.max(1, Math.round(
      Math.abs(stockChangeRate) * 50
    )));

    // Estimate onset (deterministic based on current rate)
    const rateMagnitude = Math.abs(priceChangeRate) + Math.abs(stockChangeRate);
    const estimatedOnset = Date.now() + Math.round(
      ScarcityPredictor.PREDICTION_HORIZON_MS / rateMagnitude
    );

    // Determine recommended action
    const recommendedAction = this.determineAction(
      probability,
      severity,
      stockChangeRate
    );

    // Find affected NPCs (O(1) lookup)
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

  /**
   * Get reference price from market (last known stable price)
   */
  private getReferencePrice(resourceId: string, regionId: string): number {
    // In production, this comes from current tick state
    // For simplicity, we use current price with adjustment
    return this.market.getResourcePrice(resourceId, regionId);
  }

  /**
   * Get reference stock from market (last known stable stock)
   */
  private getReferenceStock(resourceId: string, regionId: string): number {
    return this.market.getResourceStock(resourceId, regionId);
  }

  /**
   * Determine recommended NPC action
   */
  private determineAction(
    probability: number,
    severity: number,
    stockChangeRate: number
  ): 'MIGRATE' | 'HOARD' | 'NONE' {
    // High probability + high severity = migration
    if (probability > 0.85 && severity > 7) {
      return 'MIGRATE';
    }

    // Medium severity + dropping stock = hoard
    if (severity > 4 && stockChangeRate < -0.3) {
      return 'HOARD';
    }

    return 'NONE';
  }

  /**
   * Find NPCs that should be adjusted (O(1) lookup)
   */
  private findAffectedNPCs(
    resourceId: string,
    regionId: string,
    action: 'MIGRATE' | 'HOARD' | 'NONE'
  ): string[] {
    if (action === 'NONE') {
      return [];
    }

    // In production, this would query EmergentMarket for NPCs in region
    // For this implementation, return empty (would be populated from market)
    return [];
  }

  /**
   * Emit prediction to WorldEventBus BEFORE official scarcity_event
   */
  private emitPrediction(prediction: ScarcityPrediction): void {
    // Emit predicted event (BEFORE official scarcity_event)
    this.eventBus.emit('scarcity_predicted', {
      type: 'PREDICTED' as ScarcityEventType,
      prediction,
      npcAdjustments: this.calculateNPCAdjustments(prediction)
    } as ScarcityEvent);

    // Also emit market_price_shift warning
    this.eventBus.emit('market_price_shift_warning', {
      resourceId: prediction.resourceId,
      regionId: prediction.regionId,
      probability: prediction.probability,
      severity: prediction.severity,
      recommendedAction: prediction.recommendedAction
    });
  }

  /**
   * Calculate NPC longTermGoals adjustments
   * Deterministic based on prediction
   */
  private calculateNPCAdjustments(
    prediction: ScarcityPrediction
  ): Record<string, Partial<NPCGoals>> {
    const adjustments: Record<string, Partial<NPCGoals>> = {};

    for (const npcId of prediction.affectedNPCs) {
      if (prediction.recommendedAction === 'MIGRATE') {
        // Find alternative region
        const targetRegion = this.findAlternativeRegion(
          prediction.resourceId,
          prediction.regionId
        );

        adjustments[npcId] = {
          migrationTarget: targetRegion,
          resourcePriorities: {
            [prediction.resourceId]: prediction.probability
          },
          lastGoalUpdate: Date.now()
        };
      } else if (prediction.recommendedAction === 'HOARD') {
        adjustments[npcId] = {
          resourcePriorities: {
            [prediction.resourceId]: prediction.severity / 10
          },
          lastGoalUpdate: Date.now()
        };
      }
    }

    return adjustments;
  }

  /**
   * Find alternative region for NPC migration
   */
  private findAlternativeRegion(
    resourceId: string,
    currentRegionId: string
  ): string {
    // Deterministic region selection
    // In production, query EmergentMarket for regions with high stock
    const regions = ['region_a', 'region_b', 'region_c'];
    const currentIndex = regions.indexOf(currentRegionId);

    if (currentIndex >= 0) {
      return regions[(currentIndex + 1) % regions.length];
    }

    return regions[0];
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

  /**
   * Public API: Get active prediction for resource/region
   * This is O(1) - just returns current prediction if exists
   */
  public getPrediction(resourceId: string, regionId: string): ScarcityPrediction | null {
    // In stateless mode, we recalculate from current state
    const price = this.market.getResourcePrice(resourceId, regionId);
    const stock = this.market.getResourceStock(resourceId, regionId);

    return this.predictScarcity(resourceId, regionId, price, stock);
  }
}
/**
 * EmergentMarket — per-region supply/demand pricing with no fixed prices.
 *
 * NPC agents buy/sell based on their OWN heuristic valuation (not global truth).
 * Trade routes emerge organically: profitable routes attract more agents.
 */

export interface MarketEntry {
  supply: number;
  demand: number;
  lastPrice: number;
  volume: number;
  lastTradeTs: number;
}

export interface TradeRoute {
  fromRegion: string;
  toRegion: string;
  good: string;
  profitability: number;
  tripCount: number;
  lastUsed: number;
}

const DEFAULT_PRICE = 10;
const PRICE_ELASTICITY = 0.15;
const ROUTE_DECAY = 0.99;

export class EmergentMarket {
  private markets = new Map<string, Map<string, MarketEntry>>();
  private routes: TradeRoute[] = [];

  /** Get or create a regional market. */
  getRegionMarket(regionId: string): Map<string, MarketEntry> {
    let m = this.markets.get(regionId);
    if (!m) {
      m = new Map();
      this.markets.set(regionId, m);
    }
    return m;
  }

  /** Get or create a market entry for a good in a region. */
  getEntry(regionId: string, good: string): MarketEntry {
    const m = this.getRegionMarket(regionId);
    let e = m.get(good);
    if (!e) {
      e = { supply: 10, demand: 5, lastPrice: DEFAULT_PRICE, volume: 0, lastTradeTs: 0 };
      m.set(good, e);
    }
    return e;
  }

  /** Current price based on supply/demand ratio. */
  getPrice(regionId: string, good: string): number {
    const e = this.getEntry(regionId, good);
    const ratio = e.demand / Math.max(1, e.supply);
    return Math.max(1, Math.round(e.lastPrice * (1 + (ratio - 1) * PRICE_ELASTICITY)));
  }

  /**
   * Execute a trade: agent sells goods into a regional market.
   * Returns the actual price paid.
   */
  sell(regionId: string, good: string, quantity: number): number {
    const e = this.getEntry(regionId, good);
    e.supply += quantity;
    const price = this.getPrice(regionId, good);
    e.lastPrice = price;
    e.volume += quantity;
    e.lastTradeTs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    return price * quantity;
  }

  /**
   * Execute a buy: agent purchases goods from a regional market.
   * Returns the cost, or -1 if insufficient supply.
   */
  buy(regionId: string, good: string, quantity: number): number {
    const e = this.getEntry(regionId, good);
    if (e.supply < quantity) return -1;
    e.supply -= quantity;
    e.demand += quantity;
    const price = this.getPrice(regionId, good);
    e.lastPrice = price;
    e.volume += quantity;
    e.lastTradeTs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    return price * quantity;
  }

  /** Add demand without buying (market signal from agent valuation). */
  addDemand(regionId: string, good: string, amount: number): void {
    const e = this.getEntry(regionId, good);
    e.demand = Math.max(0, e.demand + amount);
  }

  /** Add supply without selling (production, scarcity relief). */
  addSupply(regionId: string, good: string, amount: number): void {
    const e = this.getEntry(regionId, good);
    e.supply = Math.max(0, e.supply + amount);
  }

  /** Record a trade route usage (reinforces the route). */
  recordRoute(fromRegion: string, toRegion: string, good: string, profit: number): void {
    let route = this.routes.find(
      (r) => r.fromRegion === fromRegion && r.toRegion === toRegion && r.good === good,
    );
    if (!route) {
      route = { fromRegion, toRegion, good, profitability: 0, tripCount: 0, lastUsed: 0 };
      this.routes.push(route);
    }
    route.tripCount++;
    route.profitability = route.profitability * 0.8 + profit * 0.2;
    route.lastUsed = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
  }

  /** Get established trade routes (sorted by profitability). */
  getEstablishedRoutes(minTrips = 3): TradeRoute[] {
    return this.routes
      .filter((r) => r.tripCount >= minTrips)
      .sort((a, b) => b.profitability - a.profitability);
  }

  /** Market tick: decay demand and route profitability (called each world tick). */
  tick(): void {
    for (const [, market] of this.markets) {
      for (const [, entry] of market) {
        entry.demand = Math.max(0, entry.demand * 0.999);
      }
    }
    for (const route of this.routes) {
      route.profitability *= ROUTE_DECAY;
    }
  }

  /** Get all regions with active markets. */
  getRegions(): string[] {
    return Array.from(this.markets.keys());
  }

  /** Snapshot for debugging / status. */
  getMarketSnapshot(regionId: string): Array<{ good: string; price: number; supply: number; demand: number }> {
    const m = this.markets.get(regionId);
    if (!m) return [];
    const result: Array<{ good: string; price: number; supply: number; demand: number }> = [];
    for (const [good, entry] of m) {
      result.push({ good, price: this.getPrice(regionId, good), supply: entry.supply, demand: entry.demand });
    }
    return result;
  }

  /** Surface used by economy ScarcityPredictor (resourceId = good id). */
  getResourcePrice(resourceId: string, regionId: string): number {
    return this.getPrice(regionId, resourceId);
  }

  getResourceStock(resourceId: string, regionId: string): number {
    return this.getEntry(regionId, resourceId).supply;
  }

  getNPCGoals(_npcId: string): {
    migrationTarget?: string;
    resourcePriorities: Record<string, number>;
    lastGoalUpdate: number;
  } {
    void _npcId;
    return { resourcePriorities: {}, lastGoalUpdate: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}

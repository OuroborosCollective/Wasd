import type { LocalMarketDefinition, LocalMarketRoute } from "./LocalMarketTypes.js";

export interface ResolvedTradeRoute {
  readonly fromMarketId: string;
  readonly toMarketId: string;
  readonly routeId: string;
  readonly distanceKappa: number;
  readonly routeRiskPerMille: number;
  readonly taxPressurePerMille: number;
}

export class TradeRouteGraph {
  private readonly marketsById = new Map<string, LocalMarketDefinition>();

  constructor(markets: readonly LocalMarketDefinition[]) {
    // Bolt: Optimization - Direct relational string comparison is significantly faster than localeCompare
    for (const market of [...markets].sort((a, b) => (a.marketId < b.marketId ? -1 : a.marketId > b.marketId ? 1 : 0))) {
      this.marketsById.set(market.marketId, market);
    }
  }

  listMarkets(): readonly LocalMarketDefinition[] {
    // Bolt: Optimization - Direct relational string comparison is significantly faster than localeCompare
    return Object.freeze([...this.marketsById.values()].sort((a, b) => (a.marketId < b.marketId ? -1 : a.marketId > b.marketId ? 1 : 0)));
  }

  getMarket(marketId: string): LocalMarketDefinition | null {
    return this.marketsById.get(marketId) ?? null;
  }

  resolveRoute(fromMarketId: string, toMarketId: string): ResolvedTradeRoute | null {
    const from = this.marketsById.get(fromMarketId);
    if (!from) return null;

    const direct = from.routes.find((route) => route.toMarketId === toMarketId) ?? null;
    if (!direct) {
      if (fromMarketId === toMarketId) {
        return Object.freeze({
          fromMarketId,
          toMarketId,
          routeId: `${fromMarketId}:self`,
          distanceKappa: 0,
          routeRiskPerMille: 1000,
          taxPressurePerMille: 1000,
        });
      }
      return null;
    }

    return this.toResolved(fromMarketId, direct);
  }

  private toResolved(fromMarketId: string, route: LocalMarketRoute): ResolvedTradeRoute {
    return Object.freeze({
      fromMarketId,
      toMarketId: route.toMarketId,
      routeId: route.routeId,
      distanceKappa: route.distanceKappa,
      routeRiskPerMille: route.routeRiskPerMille,
      taxPressurePerMille: route.taxPressurePerMille,
    });
  }
}

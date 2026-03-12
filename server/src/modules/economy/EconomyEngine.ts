export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
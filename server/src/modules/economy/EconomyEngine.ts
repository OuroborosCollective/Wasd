export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number>, taxRate: number }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {}, taxRate: 0.1 });
  }

  getMarket(id: string) {
    return this.markets.get(id);
  }

  trade(marketId: string, item: string, amount: number, factionReputation: number = 0) {
    const market = this.markets.get(marketId);
    if (!market) return null;

    // Influence price based on stock and reputation
    if (!market.goods[item]) market.goods[item] = 100; // Base stock

    market.goods[item] += amount;

    // Simple price calculation
    const basePrice = 10;
    const supplyFactor = 100 / Math.max(1, market.goods[item]);
    const repDiscount = Math.max(0.5, 1 - (factionReputation / 100));

    const price = Math.max(1, Math.floor(basePrice * supplyFactor * repDiscount * (1 + market.taxRate)));

    return {
      newStock: market.goods[item],
      price
    };
  }
}

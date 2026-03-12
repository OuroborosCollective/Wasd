export class PriceBalancer {
  rebalance(basePrice: number, supply: number, demand: number) {
    const ratio = demand / Math.max(1, supply);
    return Math.max(1, basePrice * ratio);
  }
}
export class MarketExpansion {
  calculateRegionalModifier(region: string) {
    if (region === "warzone") return 1.5;
    if (region === "trade_hub") return 0.9;
    return 1.0;
  }

  applyModifier(basePrice: number, modifier: number) {
    return Math.max(1, Math.round(basePrice * modifier));
  }
}
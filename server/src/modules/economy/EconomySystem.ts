export class EconomySystem {
  private goldSupply: number = 0;
  private itemPrices: Map<string, number> = new Map();
  private defaultPrices: Map<string, number> = new Map();

  constructor() {
    this.defaultPrices.set("health_potion", 50);
    this.defaultPrices.set("iron_sword", 150);
    this.resetPrices();
  }

  addGold(player: any, amount: number) {
    player.gold = (player.gold || 0) + amount;
    this.goldSupply += amount;
  }

  removeGold(player: any, amount: number) {
    if ((player.gold || 0) >= amount) {
      player.gold -= amount;
      this.goldSupply -= amount;
      return true;
    }
    return false;
  }

  getPrice(itemId: string): number {
    return this.itemPrices.get(itemId) || 10;
  }

  adjustPrice(itemId: string, demandFactor: number) {
    const currentPrice = this.getPrice(itemId);
    const newPrice = Math.max(1, Math.floor(currentPrice * demandFactor));
    this.itemPrices.set(itemId, newPrice);
  }

  setPrice(itemId: string, buyPrice: number, _sellPrice?: number) {
    const normalized = Math.max(1, Math.floor(Number(buyPrice) || 1));
    this.itemPrices.set(itemId, normalized);
  }

  resetPrices() {
    this.itemPrices = new Map(this.defaultPrices);
  }

  getShop(_shopId: string) {
    return Array.from(this.itemPrices.entries()).map(([itemId, buyPrice]) => ({
      itemId,
      buyPrice,
      sellPrice: Math.max(1, Math.floor(buyPrice * 0.4)),
    }));
  }
}

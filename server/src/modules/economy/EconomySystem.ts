export class EconomySystem {
  private goldSupply: number = 0;
  private itemPrices: Map<string, number> = new Map();

  constructor() {
    this.itemPrices.set("health_potion", 50);
    this.itemPrices.set("iron_sword", 150);
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
}

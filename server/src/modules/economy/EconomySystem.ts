import { EconomyEngine } from "./EconomyEngine.js";

export class EconomySystem {
  private goldSupply: number = 0;
  private engine: EconomyEngine = new EconomyEngine();

  constructor() {
    this.engine.registerMarket("main_market");
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

  registerMarket(id: string) {
    this.engine.registerMarket(id);
  }

  trade(marketId: string, item: string, amount: number, factionReputation: number = 0) {
    return this.engine.trade(marketId, item, amount, factionReputation);
  }

  getPrice(marketId: string, itemId: string): number {
    const market = this.engine.getMarket(marketId);
    if (!market) return 10;
    const res = this.trade(marketId, itemId, 0);
    return res ? res.price : 10;
  }
}

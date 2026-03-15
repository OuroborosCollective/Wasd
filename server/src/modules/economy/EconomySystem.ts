import { ItemRegistry } from "../inventory/ItemRegistry.js";

export interface ShopItem {
  itemId: string;
  basePrice: number;
  stock: number;
  maxStock: number;
}

export class EconomySystem {
  private goldSupply: number = 0;
  private itemPrices: Map<string, number> = new Map();
  private shops: Map<string, ShopItem[]> = new Map();

  constructor() {
    this.itemPrices.set("health_potion", 50);
    this.itemPrices.set("iron_sword", 150);
    this.itemPrices.set("starter_sword", 25);
    this.itemPrices.set("iron_scrap", 10);
    this.itemPrices.set("wolf_pelt", 30);
    this.itemPrices.set("wooden_shield", 75);
    this.itemPrices.set("herb_bundle", 15);

    this.shops.set("general_store", [
      { itemId: "health_potion", basePrice: 50, stock: 10, maxStock: 10 },
      { itemId: "iron_scrap", basePrice: 15, stock: 5, maxStock: 5 },
    ]);
  }

  addGold(player: any, amount: number) {
    player.gold = (player.gold || 0) + amount;
    this.goldSupply += amount;
  }

  removeGold(player: any, amount: number): boolean {
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

  getSellPrice(itemId: string): number {
    return Math.floor(this.getPrice(itemId) * 0.4);
  }

  buyItem(player: any, shopId: string, itemId: string): { success: boolean; reason?: string } {
    const shop = this.shops.get(shopId);
    if (!shop) return { success: false, reason: "Shop not found" };
    const shopItem = shop.find(s => s.itemId === itemId);
    if (!shopItem) return { success: false, reason: "Item not in shop" };
    if (shopItem.stock <= 0) return { success: false, reason: "Out of stock" };
    const price = shopItem.basePrice;
    if (!this.removeGold(player, price)) return { success: false, reason: `Need ${price} gold` };
    const item = ItemRegistry.createInstance(itemId);
    if (!item) return { success: false, reason: "Item error" };
    if (!player.inventory) player.inventory = [];
    player.inventory.push(item);
    shopItem.stock -= 1;
    return { success: true };
  }

  sellItem(player: any, itemId: string): { success: boolean; gold?: number; reason?: string } {
    const index = (player.inventory || []).findIndex((i: any) => i.id === itemId);
    if (index === -1) return { success: false, reason: "Item not found" };
    const sellPrice = this.getSellPrice(itemId);
    player.inventory.splice(index, 1);
    this.addGold(player, sellPrice);
    return { success: true, gold: sellPrice };
  }

  getShop(shopId: string): ShopItem[] {
    return this.shops.get(shopId) || [];
  }

  restockShops() {
    for (const [, shop] of this.shops) {
      for (const item of shop) {
        if (item.stock < item.maxStock) item.stock = Math.min(item.maxStock, item.stock + 1);
      }
    }
  }

  adjustPrice(itemId: string, demandFactor: number) {
    const currentPrice = this.getPrice(itemId);
    const newPrice = Math.max(1, Math.floor(currentPrice * demandFactor));
    this.itemPrices.set(itemId, newPrice);
  }

  setPrice(itemId: string, buyPrice: number, sellPrice?: number) {
    this.itemPrices.set(itemId, buyPrice);
    // Update shop items too
    for (const [, shop] of this.shops) {
      const shopItem = shop.find(s => s.itemId === itemId);
      if (shopItem) shopItem.basePrice = buyPrice;
    }
  }

  resetPrices() {
    this.itemPrices.set("health_potion", 50);
    this.itemPrices.set("iron_sword", 150);
    this.itemPrices.set("starter_sword", 25);
    this.itemPrices.set("iron_scrap", 10);
    this.itemPrices.set("wolf_pelt", 30);
    this.itemPrices.set("wooden_shield", 75);
    this.itemPrices.set("herb_bundle", 15);
  }

  getAllPrices(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [k, v] of this.itemPrices) result[k] = v;
    return result;
  }

  getGoldSupply(): number {
    return this.goldSupply;
  }
}

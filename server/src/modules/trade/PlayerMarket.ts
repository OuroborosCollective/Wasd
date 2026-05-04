// @ts-nocheck
import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class PlayerMarket {
  private listings: any[] = [];

  listItem(sellerId: string, item: any, price: number) {
    if (isItemBoundOrNonTransferable(item)) {
      return null;
    }
    const listing = { sellerId, item, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class PlayerMarket {
  private listings: any[] = [];

  listItem(sellerId: string, item: any, price: number) {
    if (isItemBoundOrNonTransferable(item)) {
      return null;
    }
    const listing = { sellerId, item, price, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class AuctionHouse {
  private listings: any[] = [];

  list(item: any, sellerId: string, price: number) {
    if (isItemBoundOrNonTransferable(item)) {
      return null;
    }
    const listing = { item, sellerId, price, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class AuctionHouse {
  private listings: any[] = [];

  list(item: any, sellerId: string, price: number) {
    if (isItemBoundOrNonTransferable(item)) {
      return null;
    }
    const listing = { item, sellerId, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}

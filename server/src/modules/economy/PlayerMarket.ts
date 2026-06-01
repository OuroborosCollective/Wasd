import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

// @ARE-GUARD-EXEMPT: Listing timestamps only; not world-state inputs.
export class PlayerMarket {
  private listings:any[] = [];
  addListing(listing:any){
    if (isItemBoundOrNonTransferable(listing?.item)) {
      return null;
    }
    this.listings.push({ ...listing, createdAt: Date.now() });
    return listing;
  }
  all(){
    return this.listings;
  }
}
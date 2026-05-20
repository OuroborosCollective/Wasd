import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class PlayerMarket {
  private listings:any[] = [];
  addListing(listing:any){
    if (isItemBoundOrNonTransferable(listing?.item)) {
      return null;
    }
    this.listings.push({ ...listing, createdAt: Date.now() }); // ARE-DETERMINISM-ALLOW
    return listing;
  }
  all(){
    return this.listings;
  }
}
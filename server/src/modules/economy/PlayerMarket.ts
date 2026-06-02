import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";
import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class PlayerMarket {
  private listings:any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  addListing(listing:any){
    if (isItemBoundOrNonTransferable(listing?.item)) {
      return null;
    }
    this.listings.push({ ...listing, createdAt: this.clock.now() });
    return listing;
  }
  all(){
    return this.listings;
  }
}

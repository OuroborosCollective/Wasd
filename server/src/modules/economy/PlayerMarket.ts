export class PlayerMarket {
  private listings:any[] = [];
  addListing(listing:any){
    this.listings.push({ ...listing, createdAt: Date.now() });
    return listing;
  }
  all(){
    return this.listings;
  }
}
export class AuctionHouse {
  private listings: any[] = [];

  list(item: any, sellerId: string, price: number) {
    const listing = { item, sellerId, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
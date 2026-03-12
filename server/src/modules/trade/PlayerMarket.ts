export class PlayerMarket {
  private listings: any[] = [];

  listItem(sellerId: string, item: any, price: number) {
    const listing = { sellerId, item, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
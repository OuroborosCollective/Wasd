export class SellOrders {
  private orders: any[] = [];

  place(sellerId: string, itemId: string, price: number, quantity: number) {
    const order = { sellerId, itemId, price, quantity, createdAt: Date.now() };
    this.orders.push(order);
    return order;
  }

  all() {
    return this.orders;
  }
}
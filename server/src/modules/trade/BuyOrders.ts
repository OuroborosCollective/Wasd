export class BuyOrders {
  private orders: any[] = [];

  place(buyerId: string, itemId: string, price: number, quantity: number) {
    const order = { buyerId, itemId, price, quantity, createdAt: Date.now() };
    this.orders.push(order);
    return order;
  }

  all() {
    return this.orders;
  }
}
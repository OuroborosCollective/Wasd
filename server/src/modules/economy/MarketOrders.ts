export class MarketOrders {
  private orders: any[] = [];

  place(order: any) {
    this.orders.push({ ...order, createdAt: Date.now() }); // ARE-DETERMINISM-ALLOW
    return order;
  }

  list() {
    return this.orders;
  }
}
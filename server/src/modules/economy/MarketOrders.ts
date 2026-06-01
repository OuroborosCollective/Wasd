// @ARE-GUARD-EXEMPT: Order timestamps only; not world-state inputs.
export class MarketOrders {
  private orders: any[] = [];

  place(order: any) {
    this.orders.push({ ...order, createdAt: Date.now() });
    return order;
  }

  list() {
    return this.orders;
  }
}
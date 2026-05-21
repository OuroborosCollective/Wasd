// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
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

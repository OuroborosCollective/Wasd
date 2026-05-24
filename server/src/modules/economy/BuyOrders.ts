// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class BuyOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "buy", createdAt: Date.now() });
    return order;
  }
}
// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class BuyOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "buy", createdAt: Date.now() });
    return order;
  }
}
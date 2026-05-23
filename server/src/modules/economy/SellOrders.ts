// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class SellOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "sell", createdAt: Date.now() });
    return order;
  }
}
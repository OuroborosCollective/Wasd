// @ARE-GUARD-EXEMPT: Order timestamps only; not world-state inputs.
export class SellOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "sell", createdAt: Date.now() });
    return order;
  }
}
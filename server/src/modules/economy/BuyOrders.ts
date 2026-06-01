// @ARE-GUARD-EXEMPT: Order timestamps only; not world-state inputs.
export class BuyOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "buy", createdAt: Date.now() });
    return order;
  }
}
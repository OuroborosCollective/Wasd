// @ARE-GUARD-EXEMPT: Order creation timestamps; not world-state input.
export class BuyOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "buy", createdAt: Date.now() });
    return order;
  }
}
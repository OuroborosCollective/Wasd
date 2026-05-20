export class SellOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "sell", createdAt: Date.now() }); // ARE-DETERMINISM-ALLOW
    return order;
  }
}
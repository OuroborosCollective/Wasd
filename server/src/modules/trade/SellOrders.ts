export class SellOrders {
  private orders: any[] = [];

  place(sellerId: string, itemId: string, price: number, quantity: number) {
    const order = { sellerId, itemId, price, quantity, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
    this.orders.push(order);
    return order;
  }

  all() {
    return this.orders;
  }
}
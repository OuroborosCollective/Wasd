import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class MarketOrders {
  private orders: any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  place(order: any) {
    this.orders.push({ ...order, createdAt: this.clock.now() });
    return order;
  }

  list() {
    return this.orders;
  }
}

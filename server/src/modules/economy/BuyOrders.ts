import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * BuyOrders - Deterministic tracking of purchase requests.
 */
export class BuyOrders {
  private orders: any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  place(order: any) {
    this.orders.push({ ...order, type: "buy", createdAt: this.clock.now() });
    return order;
  }
}

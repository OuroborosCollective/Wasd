import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * SellOrders - Deterministic tracking of sale offers.
 */
export class SellOrders {
  private orders: any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  place(order: any) {
    this.orders.push({ ...order, type: "sell", createdAt: this.clock.now() });
    return order;
  }
}

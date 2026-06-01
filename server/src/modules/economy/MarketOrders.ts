import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * MarketOrders - Deterministic order tracking.
 * Uses injected AREClock to ensure createdAt timestamps are simulation-consistent.
 */
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

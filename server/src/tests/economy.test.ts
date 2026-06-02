import { describe, it, expect, beforeEach } from "vitest";
import { TaxLedger } from "../modules/economy/TaxLedger.js";
import { MarketOrders } from "../modules/economy/MarketOrders.js";
import { MarketLedger } from "../modules/economy/MarketLedger.js";
import { FixedAREClock } from "../core/determinism/AREDeterminism.js";

describe("TaxLedger", () => {
  let ledger: TaxLedger;
  const mockNow = 1715000000;
  const clock = new FixedAREClock(mockNow);
  beforeEach(() => { ledger = new TaxLedger(clock); });
  it("record() attaches a createdAt timestamp from AREClock", () => {
    const entry = ledger.record("city1", 100, "market");
    expect(entry.createdAt).toBe(mockNow);
  });
});

describe("MarketOrders", () => {
  let orders: MarketOrders;
  const mockNow = 1715000000;
  const clock = new FixedAREClock(mockNow);
  beforeEach(() => { orders = new MarketOrders(clock); });
  it("place() attaches a createdAt timestamp from AREClock", () => {
    orders.place({ item: "gold" });
    const entry = orders.list()[0];
    expect(entry.createdAt).toBe(mockNow);
  });
});

describe("MarketLedger", () => {
  let ledger: MarketLedger;
  const mockNow = 1715000000;
  const clock = new FixedAREClock(mockNow);
  beforeEach(() => { ledger = new MarketLedger(clock); });
  it("record() attaches a timestamp field from AREClock", () => {
    ledger.record({ item: "stone" });
    const entry = ledger.all()[0];
    expect(entry.timestamp).toBe(mockNow);
  });
});

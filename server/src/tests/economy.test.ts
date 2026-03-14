import { describe, it, expect, beforeEach } from "vitest";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { EconomyEngine } from "../modules/economy/EconomyEngine.js";
import { MatrixEnergySystem } from "../modules/economy/MatrixEnergySystem.js";
import { PriceBalancer } from "../modules/economy/PriceBalancer.js";
import { MarketExpansion } from "../modules/economy/MarketExpansion.js";
import { TradeRoutes } from "../modules/economy/TradeRoutes.js";
import { TaxLedger } from "../modules/economy/TaxLedger.js";
import { MarketOrders } from "../modules/economy/MarketOrders.js";
import { MarketLedger } from "../modules/economy/MarketLedger.js";
import { NPCTradeAI } from "../modules/economy/NPCTradeAI.js";

// ---------------------------------------------------------------------------
// EconomySystem
// ---------------------------------------------------------------------------
describe("EconomySystem", () => {
  let economy: EconomySystem;

  beforeEach(() => { economy = new EconomySystem(); });

  it("addGold() increases player gold", () => {
    const player: any = { gold: 0 };
    economy.addGold(player, 100);
    expect(player.gold).toBe(100);
  });

  it("addGold() handles player with no existing gold property", () => {
    const player: any = {};
    economy.addGold(player, 50);
    expect(player.gold).toBe(50);
  });

  it("removeGold() deducts gold and returns true when funds sufficient", () => {
    const player: any = { gold: 200 };
    const result = economy.removeGold(player, 100);
    expect(result).toBe(true);
    expect(player.gold).toBe(100);
  });

  it("removeGold() returns false when insufficient funds", () => {
    const player: any = { gold: 50 };
    const result = economy.removeGold(player, 100);
    expect(result).toBe(false);
    expect(player.gold).toBe(50);
  });

  it("removeGold() handles exact balance", () => {
    const player: any = { gold: 100 };
    expect(economy.removeGold(player, 100)).toBe(true);
    expect(player.gold).toBe(0);
  });

  it("getPrice() returns default price for unknown item", () => {
    expect(economy.getPrice("unknown_item")).toBe(10);
  });

  it("getPrice() returns 50 for health_potion", () => {
    expect(economy.getPrice("health_potion")).toBe(50);
  });

  it("getPrice() returns 150 for iron_sword", () => {
    expect(economy.getPrice("iron_sword")).toBe(150);
  });

  it("adjustPrice() with factor > 1 increases price", () => {
    economy.adjustPrice("health_potion", 2.0);
    expect(economy.getPrice("health_potion")).toBe(100);
  });

  it("adjustPrice() with factor < 1 decreases price", () => {
    economy.adjustPrice("health_potion", 0.5);
    expect(economy.getPrice("health_potion")).toBe(25);
  });

  it("adjustPrice() enforces minimum price of 1", () => {
    economy.adjustPrice("health_potion", 0);
    expect(economy.getPrice("health_potion")).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// EconomyEngine
// ---------------------------------------------------------------------------
describe("EconomyEngine", () => {
  let engine: EconomyEngine;

  beforeEach(() => { engine = new EconomyEngine(); });

  it("trade() returns null for unregistered market", () => {
    expect(engine.trade("unknown_market", "wood", 5)).toBeNull();
  });

  it("registerMarket() then trade() returns updated quantity", () => {
    engine.registerMarket("m1");
    expect(engine.trade("m1", "wood", 10)).toBe(10);
  });

  it("multiple trades for the same item accumulate", () => {
    engine.registerMarket("m1");
    engine.trade("m1", "iron", 5);
    engine.trade("m1", "iron", 3);
    expect(engine.trade("m1", "iron", 0)).toBe(8);
  });

  it("different items track independently within a market", () => {
    engine.registerMarket("m1");
    engine.trade("m1", "wood", 10);
    engine.trade("m1", "stone", 20);
    expect(engine.trade("m1", "wood", 0)).toBe(10);
    expect(engine.trade("m1", "stone", 0)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// MatrixEnergySystem
// ---------------------------------------------------------------------------
describe("MatrixEnergySystem", () => {
  let matrix: MatrixEnergySystem;

  beforeEach(() => { matrix = new MatrixEnergySystem(); });

  it("getBalance() returns 0 for unknown player", () => {
    expect(matrix.getBalance("p1")).toBe(0);
  });

  it("add() increases balance", () => {
    matrix.add("p1", 100);
    expect(matrix.getBalance("p1")).toBe(100);
  });

  it("add() accumulates across multiple calls", () => {
    matrix.add("p1", 50);
    matrix.add("p1", 30);
    expect(matrix.getBalance("p1")).toBe(80);
  });

  it("consume() deducts balance and returns true when funds are sufficient", () => {
    matrix.add("p1", 100);
    expect(matrix.consume("p1", 40)).toBe(true);
    expect(matrix.getBalance("p1")).toBe(60);
  });

  it("consume() returns false when balance is insufficient", () => {
    matrix.add("p1", 10);
    expect(matrix.consume("p1", 50)).toBe(false);
    expect(matrix.getBalance("p1")).toBe(10);
  });

  it("consume() returns false for player with no balance", () => {
    expect(matrix.consume("nobody", 1)).toBe(false);
  });

  it("consume() handles exact balance", () => {
    matrix.add("p1", 100);
    expect(matrix.consume("p1", 100)).toBe(true);
    expect(matrix.getBalance("p1")).toBe(0);
  });

  it("balances are independent per player", () => {
    matrix.add("p1", 100);
    matrix.add("p2", 200);
    expect(matrix.getBalance("p1")).toBe(100);
    expect(matrix.getBalance("p2")).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PriceBalancer
// ---------------------------------------------------------------------------
describe("PriceBalancer", () => {
  let balancer: PriceBalancer;

  beforeEach(() => { balancer = new PriceBalancer(); });

  it("rebalance() returns basePrice when supply equals demand", () => {
    expect(balancer.rebalance(100, 10, 10)).toBeCloseTo(100);
  });

  it("rebalance() increases price when demand exceeds supply", () => {
    expect(balancer.rebalance(100, 5, 10)).toBeGreaterThan(100);
  });

  it("rebalance() decreases price when supply exceeds demand", () => {
    expect(balancer.rebalance(100, 10, 5)).toBeLessThan(100);
  });

  it("rebalance() returns at least 1 even with 0 demand", () => {
    expect(balancer.rebalance(100, 10, 0)).toBeGreaterThanOrEqual(1);
  });

  it("rebalance() does not divide by zero when supply is 0", () => {
    // supply is treated as Math.max(1, supply), so supply 0 becomes 1
    expect(() => balancer.rebalance(100, 0, 10)).not.toThrow();
    expect(balancer.rebalance(100, 0, 10)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// MarketExpansion
// ---------------------------------------------------------------------------
describe("MarketExpansion", () => {
  let expansion: MarketExpansion;

  beforeEach(() => { expansion = new MarketExpansion(); });

  it("calculateRegionalModifier() returns 1.5 for warzone", () => {
    expect(expansion.calculateRegionalModifier("warzone")).toBe(1.5);
  });

  it("calculateRegionalModifier() returns 0.9 for trade_hub", () => {
    expect(expansion.calculateRegionalModifier("trade_hub")).toBe(0.9);
  });

  it("calculateRegionalModifier() returns 1.0 for unknown region", () => {
    expect(expansion.calculateRegionalModifier("plains")).toBe(1.0);
  });

  it("applyModifier() multiplies and rounds base price", () => {
    expect(expansion.applyModifier(100, 1.5)).toBe(150);
  });

  it("applyModifier() enforces minimum of 1", () => {
    expect(expansion.applyModifier(1, 0)).toBeGreaterThanOrEqual(1);
  });

  it("applyModifier() rounds to nearest integer", () => {
    // 100 * 0.9 = 90 (exact)
    expect(expansion.applyModifier(100, 0.9)).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// TradeRoutes
// ---------------------------------------------------------------------------
describe("TradeRoutes", () => {
  let routes: TradeRoutes;

  beforeEach(() => { routes = new TradeRoutes(); });

  it("createRoute() sets correct 'from' city", () => {
    const route = routes.createRoute("city_a", "city_b");
    expect(route.from).toBe("city_a");
  });

  it("createRoute() sets correct 'to' city", () => {
    const route = routes.createRoute("city_a", "city_b");
    expect(route.to).toBe("city_b");
  });

  it("createRoute() marks route as active", () => {
    const route = routes.createRoute("city_a", "city_b");
    expect(route.active).toBe(true);
  });

  it("createRoute() creates distinct objects for each call", () => {
    const r1 = routes.createRoute("a", "b");
    const r2 = routes.createRoute("c", "d");
    expect(r1).not.toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// TaxLedger
// ---------------------------------------------------------------------------
describe("TaxLedger", () => {
  let ledger: TaxLedger;

  beforeEach(() => { ledger = new TaxLedger(); });

  it("all() returns empty array initially", () => {
    expect(ledger.all()).toHaveLength(0);
  });

  it("record() adds an entry", () => {
    ledger.record("city1", 500, "trade");
    expect(ledger.all()).toHaveLength(1);
  });

  it("record() returns the entry with correct fields", () => {
    const entry = ledger.record("city1", 500, "trade");
    expect(entry.cityId).toBe("city1");
    expect(entry.amount).toBe(500);
    expect(entry.source).toBe("trade");
  });

  it("record() attaches a createdAt timestamp", () => {
    const before = Date.now();
    const entry = ledger.record("city1", 100, "market");
    const after = Date.now();
    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
  });

  it("multiple records accumulate in order", () => {
    ledger.record("c1", 100, "tax");
    ledger.record("c2", 200, "tribute");
    const entries = ledger.all();
    expect(entries).toHaveLength(2);
    expect(entries[0].cityId).toBe("c1");
    expect(entries[1].cityId).toBe("c2");
  });
});

// ---------------------------------------------------------------------------
// MarketOrders
// ---------------------------------------------------------------------------
describe("MarketOrders", () => {
  let orders: MarketOrders;

  beforeEach(() => { orders = new MarketOrders(); });

  it("list() returns empty array initially", () => {
    expect(orders.list()).toHaveLength(0);
  });

  it("place() adds an order and returns the order data", () => {
    const order = { item: "iron", qty: 5 };
    const result = orders.place(order);
    expect(result).toEqual(order);
  });

  it("placed orders appear in list()", () => {
    orders.place({ item: "wood" });
    expect(orders.list()).toHaveLength(1);
  });

  it("list() entries include a createdAt timestamp", () => {
    const before = Date.now();
    orders.place({ item: "gold" });
    const after = Date.now();
    const entry = orders.list()[0];
    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
  });

  it("multiple orders accumulate", () => {
    orders.place({ item: "a" });
    orders.place({ item: "b" });
    orders.place({ item: "c" });
    expect(orders.list()).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// MarketLedger
// ---------------------------------------------------------------------------
describe("MarketLedger", () => {
  let ledger: MarketLedger;

  beforeEach(() => { ledger = new MarketLedger(); });

  it("all() returns empty array initially", () => {
    expect(ledger.all()).toHaveLength(0);
  });

  it("record() adds an entry that appears in all()", () => {
    ledger.record({ item: "iron", price: 50 });
    expect(ledger.all()).toHaveLength(1);
  });

  it("recorded entry preserves original fields", () => {
    ledger.record({ item: "wood", price: 10 });
    expect(ledger.all()[0].item).toBe("wood");
    expect(ledger.all()[0].price).toBe(10);
  });

  it("record() attaches a timestamp field", () => {
    const before = Date.now();
    ledger.record({ item: "stone" });
    const after = Date.now();
    const entry = ledger.all()[0];
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  it("multiple records accumulate", () => {
    ledger.record({ item: "a" });
    ledger.record({ item: "b" });
    expect(ledger.all()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// NPCTradeAI
// ---------------------------------------------------------------------------
describe("NPCTradeAI", () => {
  let ai: NPCTradeAI;

  beforeEach(() => { ai = new NPCTradeAI(); });

  it("decideTrade() includes the correct npcId", () => {
    const result = ai.decideTrade({ id: "npc_merchant" }, { id: "m1" });
    expect(result.npcId).toBe("npc_merchant");
  });

  it("decideTrade() includes the chosen market id", () => {
    const result = ai.decideTrade({ id: "npc1" }, { id: "harbor" });
    expect(result.chosenMarket).toBe("harbor");
  });

  it("decideTrade() uses 'unknown' when market has no id", () => {
    const result = ai.decideTrade({ id: "npc1" }, {});
    expect(result.chosenMarket).toBe("unknown");
  });

  it("decideTrade() action is always 'sell'", () => {
    const result = ai.decideTrade({ id: "npc1" }, { id: "m1" });
    expect(result.action).toBe("sell");
  });
});

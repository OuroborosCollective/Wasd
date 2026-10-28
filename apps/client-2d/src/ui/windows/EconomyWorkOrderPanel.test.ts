import { describe, expect, it } from "vitest";
import { parseVerifiedWorkOrderResponse } from "./EconomyWorkOrderPanel";

function validResponse() {
  return {
    ok: true,
    tick: 144,
    tickId: "tick:144",
    vendorId: "village_trader_001",
    revisionHash: "a1b2c3d4",
    actorEvidence: {
      schemaVersion: 1,
      actorId: "village_trader_001",
      actorType: "npc",
      role: "vendor",
      vendorType: "resource_trader",
      position: { x: 462, y: 503 },
      chunkKey: "chunk:7:7",
      definitionHash: "deadbeef",
    },
    orders: [
      {
        schemaVersion: 1,
        orderId: "work_order:village_trader_001:wood_log:cafebabe",
        kind: "resource_supply",
        npcId: "village_trader_001",
        npcActorHash: "deadbeef",
        vendorId: "village_trader_001",
        itemId: "wood_log",
        title: "Restock village timber",
        currentStock: 1,
        requiredQuantity: 5,
        tick: 144,
        stateHash: "cafebabe",
      },
    ],
  };
}

describe("parseVerifiedWorkOrderResponse", () => {
  it("accepts complete server evidence", () => {
    const parsed = parseVerifiedWorkOrderResponse(validResponse());

    expect(parsed).toEqual(expect.objectContaining({
      tick: 144,
      vendorId: "village_trader_001",
      revisionHash: "a1b2c3d4",
    }));
    expect(parsed.orders).toHaveLength(1);
  });

  it("rejects ok true without tick evidence", () => {
    const payload = validResponse();
    delete (payload as Partial<typeof payload>).tick;

    expect(() => parseVerifiedWorkOrderResponse(payload)).toThrow(/tick_evidence/);
  });

  it("rejects vendor actor mismatch", () => {
    const payload = validResponse();
    payload.actorEvidence.actorId = "invented_vendor";

    expect(() => parseVerifiedWorkOrderResponse(payload)).toThrow(/actor_evidence/);
  });

  it("rejects orders without matching state and actor hashes", () => {
    const payload = validResponse();
    payload.orders[0].npcActorHash = "badc0de";

    expect(() => parseVerifiedWorkOrderResponse(payload)).toThrow(/work_order_evidence/);
  });

  it("rejects an empty response without revision evidence", () => {
    const payload = validResponse();
    payload.orders = [];
    payload.revisionHash = "";

    expect(() => parseVerifiedWorkOrderResponse(payload)).toThrow(/revision_evidence/);
  });

  it("benchmarks fast relational string comparison vs localeCompare for sorting work orders", () => {
    const base = validResponse();
    // Generate a set of 500 work orders with padded orderIds so string collation is identical
    const count = 500;
    const testOrders = Array.from({ length: count }, (_, i) => {
      const vendorNum = String((i * 37) % 1000).padStart(4, "0");
      const itemNum = String((i * 97) % 500).padStart(4, "0");
      const orderId = `work_order:vendor_${vendorNum}:${itemNum}`;
      return {
        ...base.orders[0],
        orderId,
      };
    });

    const itemsForLocaleCompare = [...testOrders];
    const itemsForRelational = [...testOrders];

    // Verify sort order equivalence
    const sortedLocale = [...itemsForLocaleCompare].sort((a, b) => a.orderId.localeCompare(b.orderId));
    const sortedRelational = [...itemsForRelational].sort((a, b) => (a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0));
    expect(sortedRelational).toEqual(sortedLocale);

    const iterations = 200;

    // 1. Benchmark localeCompare sorting
    const startLocale = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...testOrders].sort((a, b) => a.orderId.localeCompare(b.orderId));
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark fast relational sorting
    const startRelational = performance.now();
    for (let i = 0; i < iterations; i++) {
      [...testOrders].sort((a, b) => (a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0));
    }
    const durationRelational = performance.now() - startRelational;

    const speedup = durationLocale / (durationRelational || 0.001);
    console.log(`[EconomyWorkOrder Benchmark] localeCompare: ${durationLocale.toFixed(2)}ms, relational: ${durationRelational.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);
  });
});

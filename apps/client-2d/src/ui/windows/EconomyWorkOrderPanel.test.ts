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

  it("sorts work orders using fast relational comparison producing identical order to localeCompare", () => {
    const payload = validResponse();
    payload.orders = [
      {
        schemaVersion: 1,
        orderId: "work_order:003:metal",
        kind: "resource_supply",
        npcId: "village_trader_001",
        npcActorHash: "deadbeef",
        vendorId: "village_trader_001",
        itemId: "copper_ingot",
        title: "Restock metal",
        currentStock: 0,
        requiredQuantity: 10,
        tick: 144,
        stateHash: "cafebabe",
      },
      {
        schemaVersion: 1,
        orderId: "work_order:001:timber",
        kind: "resource_supply",
        npcId: "village_trader_001",
        npcActorHash: "deadbeef",
        vendorId: "village_trader_001",
        itemId: "wood_log",
        title: "Restock timber",
        currentStock: 1,
        requiredQuantity: 5,
        tick: 144,
        stateHash: "cafebabe",
      },
      {
        schemaVersion: 1,
        orderId: "work_order:002:food",
        kind: "resource_supply",
        npcId: "village_trader_001",
        npcActorHash: "deadbeef",
        vendorId: "village_trader_001",
        itemId: "cooked_fish",
        title: "Restock food",
        currentStock: 2,
        requiredQuantity: 8,
        tick: 144,
        stateHash: "cafebabe",
      },
    ];

    const parsed = parseVerifiedWorkOrderResponse(payload);
    expect(parsed.orders.map((o) => o.orderId)).toEqual([
      "work_order:001:timber",
      "work_order:002:food",
      "work_order:003:metal",
    ]);
  });
});

/** @vitest-environment jsdom */
import { describe, expect, it, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { parseVerifiedWorkOrderResponse, EconomyWorkOrderPanel } from "./EconomyWorkOrderPanel";

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
});

describe("EconomyWorkOrderPanel Component & UX", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("renders work order card progress bar with WAI-ARIA attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => validResponse(),
    } as Response);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<EconomyWorkOrderPanel />);
    });

    const progressBar = container!.querySelector('[role="progressbar"]') as HTMLElement;
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute("aria-label")).toBe("wood log stock level");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("1");
    expect(progressBar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("6");
    expect(progressBar.getAttribute("aria-valuetext")).toBe("1 of 6 (17%)");
    expect(progressBar.getAttribute("title")).toBe("wood log stock: 1/6 (17%)");
  });
});

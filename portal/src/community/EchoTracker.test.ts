import { describe, it, expect, beforeEach } from "vitest";
import {
  getSignalStrength,
  renderSignalWave,
  parseBeaconPayload,
} from "./echoTrackerCore";
import { PortalWorldHistory } from "../world/PortalWorldHistory";

describe("echoTrackerCore", () => {
  it("getSignalStrength COMBAT", () => {
    expect(getSignalStrength("COMBAT")).toBe(1.0);
  });
  it("getSignalStrength COLLECT", () => {
    expect(getSignalStrength("COLLECT")).toBe(0.7);
  });
  it("getSignalStrength TALK_TO", () => {
    expect(getSignalStrength("TALK_TO")).toBe(0.4);
  });
  it("getSignalStrength unknown", () => {
    expect(getSignalStrength("UNKNOWN_TYPE")).toBe(0.1);
  });

  it("renderSignalWave label", () => {
    const r = renderSignalWave("COMBAT", 0.85);
    expect(r.label).toBe("Signal: COMBAT (85%)");
  });

  it("renderSignalWave css", () => {
    const r = renderSignalWave("COLLECT", 0.5);
    expect(r.css).toContain("opacity: 0.5");
  });

  it("parseBeaconPayload", () => {
    const b = parseBeaconPayload("id1|COMBAT|north");
    expect(b?.type).toBe("COMBAT");
    expect(b?.region).toBe("north");
  });
});

describe("PortalWorldHistory", () => {
  beforeEach(() => {
    PortalWorldHistory.resetForTests();
  });

  it("O(1) head after push", () => {
    const h = PortalWorldHistory.getInstance();
    h.recordNpcTradeComplete("t1");
    expect(h.getHead()?.summary).toBe("t1");
    h.recordNpcCombatComplete("c1");
    expect(h.getHead()?.kind).toBe("combat");
  });

  it("ingestWorldLine trade", () => {
    const h = PortalWorldHistory.getInstance();
    h.ingestWorldLine({
      id: "e1",
      title: "Trade route sealed",
      description: "deal closed with caravan",
      timestamp: Date.now(),
      involvedFactionIds: [],
    });
    expect(h.getHead()?.kind).toBe("trade");
  });
});

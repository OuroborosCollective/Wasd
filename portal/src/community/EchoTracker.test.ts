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

  it("recordRefinement appends typed refinement echo", () => {
    const h = PortalWorldHistory.getInstance();
    h.recordRefinement({
      itemId: "rusted_blade",
      itemName: "Rusted Blade",
      quality: "common",
      sector: "12:8",
      yields: "2 commonEssence",
      residueHash: "test-residue",
    });
    expect(h.getHead()?.kind).toBe("refinement");
    expect(h.getHead()?.refinement?.itemId).toBe("rusted_blade");
  });

  it("recordForge appends typed forge echo", () => {
    const h = PortalWorldHistory.getInstance();
    h.recordForge({
      blueprintId: "bp_echo_blade_t2",
      blueprintName: "Blueprint: Echo Blade",
      itemId: "echo_blade:abc",
      itemName: "Echo Blade",
      quality: "rare",
      sector: "12:8",
      stability: 0.94,
      forgeHash: "forgehash123",
    });
    expect(h.getHead()?.kind).toBe("forge");
    expect(h.getHead()?.forge?.blueprintId).toBe("bp_echo_blade_t2");
  });

  it("recordDestiny appends typed destiny echo", () => {
    const h = PortalWorldHistory.getInstance();
    h.recordDestiny({
      destinyId: "destiny_alpha",
      title: "Säuberung von Sektor 12:8",
      sector: "12:8",
      severity: "high",
      rewardBlueprint: "Blueprint: Echo Blade",
      rewardQuality: "legendary",
      destinyHash: "destinyhash123",
    });
    expect(h.getHead()?.kind).toBe("destiny");
    expect(h.getHead()?.destiny?.rewardQuality).toBe("legendary");
  });

  it("digest includes refinement forge and destiny counts", () => {
    const h = PortalWorldHistory.getInstance();
    h.recordRefinement({ itemId: "a", itemName: "A", quality: "common", sector: "1:1", yields: "1 commonEssence", residueHash: "r" });
    h.recordForge({ blueprintId: "bp", blueprintName: "BP", itemId: "i", itemName: "I", quality: "rare", sector: "1:1", stability: 1, forgeHash: "f" });
    h.recordDestiny({ title: "Destiny", rewardBlueprint: "Blueprint: Echo", rewardQuality: "rare" });
    const d = h.getEchoDigestSummary(10);
    expect(d.refinement).toBe(1);
    expect(d.forge).toBe(1);
    expect(d.destiny).toBe(1);
    expect(d.total).toBe(3);
  });
});

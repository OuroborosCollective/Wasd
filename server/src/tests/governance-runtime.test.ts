import { describe, expect, it } from "vitest";
import { GovernanceService } from "../governance/GovernanceService.js";
import { GovernanceSnapshotAdapter } from "../governance/GovernanceSnapshotAdapter.js";
import { TerritoryRegistry } from "../governance/TerritoryRegistry.js";

const serverActor = { actorId: "server-governance", role: "server" as const };

describe("Governance runtime", () => {
  it("loads authored hierarchy deterministically", () => {
    const registry = new TerritoryRegistry();
    const ids = registry.getTerritories().map((territory) => territory.territoryId);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(ids).toContain("areloria_kingdom");
    expect(ids).toContain("starter_village_settlement");
  });

  it("valid tax and law actions mutate server state", () => {
    const service = new GovernanceService();
    const before = service.stateHash();
    const tax = service.applyAction({ type: "setTaxRate", territoryId: "starter_village_settlement", taxRatePerMille: 125 }, { actor: serverActor, tick: 12 });
    expect(tax.ok).toBe(true);
    const law = service.applyAction({ type: "setLawFlag", territoryId: "starter_village_settlement", lawFlag: "gate_curfew", enabled: true }, { actor: serverActor, tick: 13 });
    expect(law.ok).toBe(true);
    expect(service.getState("starter_village_settlement")?.lawFlags.gate_curfew).toBe(true);
    expect(service.stateHash()).not.toBe(before);
  });

  it("pressure output is deterministic and adapter-based", () => {
    const service = new GovernanceService(new TerritoryRegistry(), ({ territoryId, tick }) => ({ economyPressurePerMille: territoryId.length + tick, resourcePressurePerMille: 333 }));
    const first = service.calculateConflictPressure("starter_village_settlement", 21);
    const second = service.calculateConflictPressure("starter_village_settlement", 21);
    expect(first).toEqual(second);
    expect(first.economyPressurePerMille).toBe("starter_village_settlement".length + 21);
  });

  it("invalid actor rejects without mutation", () => {
    const service = new GovernanceService();
    const before = service.stateHash();
    const result = service.applyAction({ type: "setTaxRate", territoryId: "starter_village_settlement", taxRatePerMille: 200 }, { actor: { actorId: "npc", role: "steward", territoryIds: ["other"] }, tick: 30 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("forbidden_actor");
    expect(service.stateHash()).toBe(before);
  });

  it("snapshot ordering is stable and server-derived", () => {
    const adapter = new GovernanceSnapshotAdapter(new GovernanceService());
    const first = adapter.composeSnapshot(40);
    const second = adapter.composeSnapshot(40);
    expect(first).toEqual(second);
    expect(first.territories.map((territory) => territory.territoryId)).toEqual([...first.territories.map((territory) => territory.territoryId)].sort((a, b) => a.localeCompare(b)));
    expect(first.snapshotHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

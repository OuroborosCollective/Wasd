import { describe, expect, it } from "vitest";
import { evaluateGovernanceAction } from "../governance/GovernanceActionContract.js";
import { sortTerritories, territoryHash, validateTerritoryKey } from "../governance/TerritoryModel.js";
import type { GovernanceAction, TerritoryKey } from "../governance/GovernanceTypes.js";

function action(kind: GovernanceAction["kind"] = "raise_tax"): GovernanceAction {
  return Object.freeze({
    actionId: "gov_action_001",
    kind,
    actorId: "actor_council_1",
    territoryId: "territory_village_1",
    tick: 1234,
    payload: Object.freeze({ rateKappa: 120 }),
  });
}

describe("governance contracts", () => {
  it("marks unsupported governance actions as no-mutation diagnostics", () => {
    const result = evaluateGovernanceAction(action("declare_war"));

    expect(result.supported).toBe(false);
    expect(result.status).toBe("unsupported_action");
    expect(result.mutatesState).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("unsupported_action");
    expect(result.evaluationHash).toMatch(/^[0-9a-f]+$/);
  });

  it("keeps deterministic evaluation hashes for identical actions", () => {
    const a = evaluateGovernanceAction(action("change_trade_policy"));
    const b = evaluateGovernanceAction(action("change_trade_policy"));

    expect(a.evaluationHash).toBe(b.evaluationHash);
  });

  it("validates and sorts territory keys deterministically", () => {
    const territories: TerritoryKey[] = [
      { id: "guild_overlay_1", layer: "guild_or_faction_overlay", parentId: "village_1" },
      { id: "kingdom_1", layer: "kingdom" },
      { id: "settlement_1", layer: "settlement", parentId: "province_1" },
    ];

    expect(validateTerritoryKey(territories[0])).toEqual([]);
    expect(sortTerritories(territories).map((territory) => territory.layer)).toEqual([
      "kingdom",
      "settlement",
      "guild_or_faction_overlay",
    ]);
    expect(territoryHash(territories[0])).toBe(territoryHash(territories[0]));
  });
});

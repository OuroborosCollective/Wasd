import { afterEach, describe, expect, it } from "vitest";
import {
  EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS,
  getGenkitGameplayCapabilities,
  resetGenkitGameplayOperatorSequences,
} from "../gameplayOperator.js";

const originalToken = process.env.MCP_ADMIN_TOKEN;

afterEach(() => {
  resetGenkitGameplayOperatorSequences();
  if (originalToken === undefined) delete process.env.MCP_ADMIN_TOKEN;
  else process.env.MCP_ADMIN_TOKEN = originalToken;
});

describe("Genkit authoritative gameplay operator contract", () => {
  it("exposes only fixed authoritative action identifiers", () => {
    expect(EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS).toEqual([
      "move",
      "combat_attack",
      "gather",
      "quest_talk",
      "quest_accept",
      "quest_complete",
      "craft",
      "equipment_equip",
      "equipment_unequip",
      "economy_sell_resource",
      "economy_sell_all_resources",
      "economy_buy_resource",
      "economy_complete_camp_quest",
      "economy_trade_transfer",
    ]);

    const capabilities = getGenkitGameplayCapabilities();
    const executable = capabilities.executable as ReadonlyArray<Record<string, unknown>>;
    for (const entry of executable) {
      if (entry.action === "move" || entry.action === "combat_attack") continue;
      expect(String(entry.path)).toMatch(/^\/api\//);
      expect(entry.authority).toBe("existing_server_route");
      expect(entry.canonicalIntentExpected).toBe(true);
    }

    const combat = executable.find((entry) => entry.action === "combat_attack");
    expect(combat?.authority).toBe("WorldTickThinShell -> TickSystemRegistry -> CombatTickSystem");
    expect(capabilities.combatRuntime.available).toBe(true);
  });

  it("keeps remaining truth gaps blocked instead of advertising fake authority", () => {
    const capabilities = getGenkitGameplayCapabilities();
    const blocked = capabilities.blocked.map((entry) => entry.capability);
    expect(blocked).toContain("direct_inventory_mutation");
    expect(blocked).toContain("guild_governance");
    expect(blocked).not.toContain("combat");
    expect(blocked).not.toContain("equipment_mutation");
  });

  it("reports operator credential presence without exposing its value", () => {
    process.env.MCP_ADMIN_TOKEN = "never-print-this-owner-secret";
    const serialized = JSON.stringify(getGenkitGameplayCapabilities());
    expect(serialized).toContain('"operatorAuthConfigured":true');
    expect(serialized).not.toContain("never-print-this-owner-secret");
  });
});

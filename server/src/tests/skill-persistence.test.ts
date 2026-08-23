import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { JsonSkillPersistenceAdapter } from "../skills/JsonSkillPersistenceAdapter.js";
import { createPersistedPlayerSkillState } from "../skills/SkillPersistence.js";
import {
  applySkillXp,
  createDefaultPlayerSkillState,
} from "../skills/SkillTypes.js";

describe("JsonSkillPersistenceAdapter", () => {
  const testFilePath = "/tmp/test-skill-state.json";
  let adapter: JsonSkillPersistenceAdapter;

  beforeEach(() => {
    if (existsSync(testFilePath)) unlinkSync(testFilePath);
    adapter = new JsonSkillPersistenceAdapter(testFilePath);
  });

  afterEach(() => {
    if (existsSync(testFilePath)) unlinkSync(testFilePath);
  });

  it("returns null for a new player", async () => {
    expect(await adapter.loadPlayerSkillState("new-player")).toBeNull();
  });

  it("saves and loads schema-2 exact progression", async () => {
    const initial = createDefaultPlayerSkillState("p1");
    const combat = initial.skills.find((skill) => skill.id === "combat")!;
    const progressed = {
      ...initial,
      skills: initial.skills.map((skill) =>
        skill.id === "combat" ? applySkillXp(combat, 201) : skill,
      ),
    };
    const state = createPersistedPlayerSkillState("p1", progressed);

    await adapter.savePlayerSkillState(state);
    const loaded = await adapter.loadPlayerSkillState("p1");
    const loadedCombat = loaded?.skills.find((skill) => skill.id === "combat");

    expect(loaded?.schemaVersion).toBe(2);
    expect(loadedCombat?.xpExact).toBe("201");
    expect(loadedCombat?.levelExact).toBe("3");
    expect(loadedCombat?.xpIntoLevelExact).toBe("20");
  });

  it("overwrites an existing player without affecting another player", async () => {
    const p1 = createPersistedPlayerSkillState("p1", createDefaultPlayerSkillState("p1"));
    const p2 = createPersistedPlayerSkillState("p2", createDefaultPlayerSkillState("p2"));
    await adapter.savePlayerSkillState(p1);
    await adapter.savePlayerSkillState(p2);

    const p1Combat = p1.skills.find((skill) => skill.id === "combat")!;
    const updatedP1 = createPersistedPlayerSkillState("p1", {
      ...p1,
      skills: p1.skills.map((skill) =>
        skill.id === "combat" ? applySkillXp(p1Combat, 500) : skill,
      ),
    });
    await adapter.savePlayerSkillState(updatedP1);

    const loaded1 = await adapter.loadPlayerSkillState("p1");
    const loaded2 = await adapter.loadPlayerSkillState("p2");
    expect(loaded1?.skills.find((skill) => skill.id === "combat")?.xpExact).toBe("500");
    expect(loaded2?.skills.find((skill) => skill.id === "combat")?.xpExact).toBe("0");
  });

  it("migrates a legacy schema-1 number-only row to exact schema 2", async () => {
    const legacy = {
      playerId: "legacy",
      schemaVersion: 1,
      skills: [
        {
          id: "combat",
          title: "Combat",
          level: 3,
          xp: 201,
          xpForNextLevel: 0,
          progressRatio: 0,
        },
      ],
    } as any;

    await adapter.savePlayerSkillState(createPersistedPlayerSkillState("legacy", legacy));
    const loaded = await adapter.loadPlayerSkillState("legacy");
    const combat = loaded?.skills.find((skill) => skill.id === "combat");

    expect(loaded?.schemaVersion).toBe(2);
    expect(combat?.levelExact).toBe("3");
    expect(combat?.xpExact).toBe("201");
    expect(combat?.xpIntoLevelExact).toBe("20");
  });

  it("reports a writable health surface", async () => {
    const result = await adapter.health();
    expect(result.ok).toBe(true);
    expect(result.driver).toBe("json");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { SkillSystem } from "../modules/skill/SkillSystem.js";

describe("SkillSystem compatibility facade", () => {
  let skills: SkillSystem;

  beforeEach(() => {
    skills = new SkillSystem();
  });

  it("creates an exact level-1 skill when missing", () => {
    const player: any = { skills: {} };
    const skill = skills.ensureSkill(player, "mining");
    expect(skill.level).toBe(1);
    expect(skill.xp).toBe(0);
    expect(skill.levelExact).toBe("1");
    expect(skill.xpExact).toBe("0");
    expect(skill.xpIntoLevelExact).toBe("0");
  });

  it("migrates existing number-only skill state instead of overwriting XP", () => {
    const player: any = { skills: { mining: { level: 5, xp: 201 } } };
    const skill = skills.ensureSkill(player, "mining");
    expect(skill.xpExact).toBe("201");
    expect(skill.levelExact).toBe("3");
    expect(skill.xpIntoLevelExact).toBe("20");
  });

  it("uses the canonical Arelorian XP curve", () => {
    expect(skills.nextLevelXP(1)).toBe(50);
    expect(skills.nextLevelXP(2)).toBe(131);
    expect(skills.nextLevelXP(3)).toBe(232);
    expect(skills.nextLevelXP(5)).toBeGreaterThan(skills.nextLevelXP(2));
  });

  it("accumulates XP and crosses multiple levels deterministically", () => {
    const player: any = { skills: {} };
    const result = skills.addXP(player, "magic", 1000);
    expect(result.skill.xpExact).toBe("1000");
    expect(BigInt(result.skill.levelExact)).toBeGreaterThan(2n);
    expect(result.leveledUp).toBe(true);
  });

  it("accumulates XP across chunked calls identically", () => {
    const oneBatch: any = { skills: {} };
    const chunked: any = { skills: {} };
    skills.addXP(oneBatch, "farming", 1000);
    skills.addXP(chunked, "farming", 400);
    skills.addXP(chunked, "farming", 600);
    expect(chunked.skills.farming.levelExact).toBe(oneBatch.skills.farming.levelExact);
    expect(chunked.skills.farming.xpExact).toBe(oneBatch.skills.farming.xpExact);
    expect(chunked.skills.farming.xpIntoLevelExact).toBe(oneBatch.skills.farming.xpIntoLevelExact);
  });

  it("continues beyond level 99", () => {
    const player: any = {
      skills: {
        combat: {
          level: 99,
          xp: 1_000_000_000,
          levelExact: "99",
          xpExact: "1000000000",
          xpIntoLevelExact: "0",
        },
      },
    };
    skills.addXP(player, "combat", skills.nextLevelXP(99));
    expect(player.skills.combat.levelExact).toBe("100");
  });

  it("does not accept non-integer or non-positive XP deltas", () => {
    const player: any = { skills: {} };
    skills.addXP(player, "combat", 0);
    skills.addXP(player, "combat", -1);
    skills.addXP(player, "combat", 1.5);
    expect(player.skills.combat.xpExact).toBe("0");
  });

  it("keeps existing overall player-level behavior", () => {
    const player: any = { xp: 0, level: 1, mana: 25, maxMana: 25 };
    skills.checkPlayerLevel(player);
    expect(player.level).toBe(1);
    expect(player.maxMana).toBe(25);
    player.xp = 100;
    skills.checkPlayerLevel(player);
    expect(player.level).toBe(2);
    expect(player.maxMana).toBe(30);
    expect(player.mana).toBe(30);
  });
});

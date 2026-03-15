import { describe, it, expect, beforeEach } from "vitest";
import { SkillSystem } from "../modules/skill/SkillSystem.js";

// ---------------------------------------------------------------------------
// SkillSystem
// ---------------------------------------------------------------------------
describe("SkillSystem", () => {
  let skills: SkillSystem;

  beforeEach(() => { skills = new SkillSystem(); });

  // ---- ensureSkill ---------------------------------------------------------

  it("ensureSkill() creates skill at level 1 with 0 xp when missing", () => {
    const player: any = { skills: {} };
    skills.ensureSkill(player, "mining");
    expect(player.skills.mining).toEqual({ level: 1, xp: 0 });
  });

  it("ensureSkill() does not overwrite an existing skill", () => {
    const player: any = { skills: { mining: { level: 5, xp: 200 } } };
    skills.ensureSkill(player, "mining");
    expect(player.skills.mining.level).toBe(5);
    expect(player.skills.mining.xp).toBe(200);
  });

  // ---- nextLevelXP ---------------------------------------------------------

  it("nextLevelXP() returns a positive number for level 1", () => {
    expect(skills.nextLevelXP(1)).toBeGreaterThan(0);
  });

  it("nextLevelXP() increases as level increases", () => {
    const xp1 = skills.nextLevelXP(1);
    const xp2 = skills.nextLevelXP(2);
    const xp5 = skills.nextLevelXP(5);
    expect(xp2).toBeGreaterThan(xp1);
    expect(xp5).toBeGreaterThan(xp2);
  });

  it("nextLevelXP(1) is floor(50 * 1^1.4) = 50", () => {
    expect(skills.nextLevelXP(1)).toBe(50);
  });

  // ---- addXP ---------------------------------------------------------------

  it("addXP() accumulates xp on the skill", () => {
    const player: any = { skills: {} };
    skills.addXP(player, "crafting", 20);
    expect(player.skills.crafting.xp).toBe(20);
  });

  it("addXP() returns an object containing the skill", () => {
    const player: any = { skills: {} };
    const result = skills.addXP(player, "crafting", 10);
    expect(result.skill).toBe(player.skills.crafting);
  });

  it("addXP() creates the skill if it does not exist", () => {
    const player: any = { skills: {} };
    skills.addXP(player, "fishing", 5);
    expect(player.skills.fishing).toBeDefined();
  });

  it("addXP() levels up skill when xp threshold is crossed", () => {
    const player: any = { skills: {} };
    // nextLevelXP(1) = 50; add exactly 50 xp to level up
    skills.addXP(player, "combat", 50);
    expect(player.skills.combat.level).toBe(2);
  });

  it("addXP() does not level up when xp is below threshold", () => {
    const player: any = { skills: {} };
    skills.addXP(player, "combat", 49);
    expect(player.skills.combat.level).toBe(1);
  });

  it("addXP() can trigger multiple level-ups in a single call", () => {
    const player: any = { skills: {} };
    // Add a very large amount of XP to skip several levels
    skills.addXP(player, "magic", 100000);
    expect(player.skills.magic.level).toBeGreaterThan(2);
  });

  it("addXP() accumulates xp across multiple calls", () => {
    const player: any = { skills: {} };
    skills.addXP(player, "farming", 20);
    skills.addXP(player, "farming", 20);
    expect(player.skills.farming.xp).toBe(40);
  });
});

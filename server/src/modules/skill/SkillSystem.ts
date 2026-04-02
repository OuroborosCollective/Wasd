import { GameConfig } from "../../config/GameConfig.js";

export interface SkillData {
  level: number;
  xp: number;
}

const SKILL_NAMES = [
  "mining", "woodcutting", "fishing", "combat", "magic", "archery",
  "runecrafting", "agility", "herblore", "thieving", "slayer",
  "farming", "smithing", "fletching"
];

export class SkillSystem {
  private readonly MAX_LEVEL = 99;

  // ⚡ Bolt Optimization: Use WeakMap for caching to avoid leaking memory and preventing
  // runtime caches from being persisted to the database.
  private skillsCache = new WeakMap<any, Record<string, SkillData>>();

  ensureSkill(player: any, skillName: string): SkillData {
    if (!player.skills) player.skills = {};
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
    return player.skills[skillName];
  }

  addXP(player: any, skillName: string, amount: number) {
    const skill = this.ensureSkill(player, skillName);
    const oldLevel = skill.level;
    skill.xp += amount;
    while (skill.level < this.MAX_LEVEL && skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    const leveledUp = skill.level > oldLevel;
    player.xp = (player.xp || 0) + amount;
    this.checkPlayerLevel(player);

    // ⚡ Bolt Optimization: Invalidate skills cache when XP is gained
    this.skillsCache.delete(player);

    return { skill, leveledUp, totalLevel: this.getTotalLevel(player) };
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }

  getLevel(player: any, skillName: string): number {
    return player.skills?.[skillName]?.level ?? 1;
  }

  getTotalLevel(player: any): number {
    if (!player.skills) return SKILL_NAMES.length;
    let total = 0;
    for (const name of SKILL_NAMES) {
      total += player.skills[name]?.level ?? 1;
    }
    return total;
  }

  checkPlayerLevel(player: any): boolean {
    const oldLevel = player.level || 1;
    const xp = player.xp || 0;
    player.level = Math.max(1, Math.floor(1 + Math.sqrt(xp / 100)));
    player.maxHealth = 100 + (player.level - 1) * 5;
    player.maxStamina = 100 + (player.level - 1) * 3;
    const perLevel = GameConfig.playerManaPerLevel;
    const prevMaxMana = 25 + (oldLevel - 1) * perLevel;
    const newMaxMana = 25 + (player.level - 1) * perLevel;
    player.maxMana = newMaxMana;
    const deltaMax = newMaxMana - prevMaxMana;
    if (player.level > oldLevel && deltaMax > 0) {
      const cur = typeof player.mana === "number" ? player.mana : prevMaxMana;
      player.mana = Math.min(newMaxMana, cur + deltaMax);
    }
    return player.level > oldLevel;
  }

  getAllSkills(player: any): Record<string, SkillData> {
    // ⚡ Bolt Optimization: Use invalidation-based caching with WeakMap to avoid O(N) loops
    // and multiple object allocations for the same skills data in the 10Hz world tick loop.
    const cached = this.skillsCache.get(player);
    if (cached) {
      return cached;
    }

    const result: Record<string, SkillData> = {};
    for (const name of SKILL_NAMES) {
      result[name] = this.ensureSkill(player, name);
    }

    this.skillsCache.set(player, result);
    return result;
  }
}

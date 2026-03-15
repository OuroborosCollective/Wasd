export interface SkillData {
  level: number;
  xp: number;
}

export const SKILL_NAMES = [
  "combat", "woodcutting", "mining", "smithing",
  "magic", "fishing", "cooking", "crafting",
  "agility", "defense"
] as const;

export type SkillName = typeof SKILL_NAMES[number];

export class SkillSystem {
  private readonly MAX_LEVEL = 99;

  ensureSkill(player: any, skillName: string): SkillData {
    if (!player.skills) player.skills = {};
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
    return player.skills[skillName];
  }

  addXP(player: any, skillName: string, amount: number): { skill: SkillData; leveledUp: boolean; totalLevel: number } {
    const skill = this.ensureSkill(player, skillName);
    const oldLevel = skill.level;
    skill.xp += amount;
    while (skill.level < this.MAX_LEVEL && skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    const leveledUp = skill.level > oldLevel;
    player.xp = (player.xp || 0) + amount;
    this.checkPlayerLevel(player);
    return { skill, leveledUp, totalLevel: this.getTotalLevel(player) };
  }

  nextLevelXP(level: number): number {
    if (level >= this.MAX_LEVEL) return Infinity;
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
    player.maxMana = 25 + (player.level - 1) * 2;
    return player.level > oldLevel;
  }

  getAllSkills(player: any): Record<string, SkillData> {
    const result: Record<string, SkillData> = {};
    for (const name of SKILL_NAMES) {
      result[name] = this.ensureSkill(player, name);
    }
    return result;
  }
}
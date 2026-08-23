import { GameConfig } from "../../config/GameConfig.js";
import {
  advanceUnboundedProgression,
  normalizeProgressionState,
  progressionFromLegacyTotalXp,
  projectExactToSafeNumber,
  xpRequiredForNextLevelExact,
  type AREUnboundedProgressionState,
} from "../../core/determinism/AREUnboundedProgression.js";

export interface SkillData {
  /** Compatibility projections. */
  level: number;
  xp: number;
  /** Exact cap-free truth. */
  levelExact?: string;
  xpExact?: string;
  xpIntoLevelExact?: string;
  numberProjectionExact?: boolean;
}

const SKILL_NAMES = [
  "mining", "woodcutting", "fishing", "combat", "magic", "archery",
  "runecrafting", "agility", "herblore", "thieving", "slayer",
  "farming", "smithing", "fletching"
];

function progressionFromSkill(skill: Partial<SkillData>): AREUnboundedProgressionState {
  if (
    typeof skill.xpExact === "string" &&
    typeof skill.levelExact === "string" &&
    typeof skill.xpIntoLevelExact === "string"
  ) {
    return normalizeProgressionState({
      totalXp: skill.xpExact,
      level: skill.levelExact,
      xpIntoLevel: skill.xpIntoLevelExact,
    });
  }

  const xp = Number(skill.xp ?? 0);
  if (!Number.isSafeInteger(xp) || xp < 0) return progressionFromLegacyTotalXp(0);
  return progressionFromLegacyTotalXp(xp);
}

function writeProgression(skill: SkillData, progression: AREUnboundedProgressionState): void {
  const xp = projectExactToSafeNumber(progression.totalXp);
  const level = projectExactToSafeNumber(progression.level);
  skill.xp = xp.value;
  skill.level = level.value;
  skill.xpExact = progression.totalXp.toString(10);
  skill.levelExact = progression.level.toString(10);
  skill.xpIntoLevelExact = progression.xpIntoLevel.toString(10);
  skill.numberProjectionExact = xp.exact && level.exact;
}

/**
 * Compatibility skill facade. Canonical level math is shared with the live
 * SkillProgressionStore/PlayerStatsDirector and has no MAX_LEVEL.
 */
export class SkillSystem {
  private skillsCache = new WeakMap<any, Record<string, SkillData>>();

  ensureSkill(player: any, skillName: string): SkillData {
    if (!player.skills) player.skills = {};
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
      writeProgression(player.skills[skillName], progressionFromLegacyTotalXp(0));
    } else {
      writeProgression(player.skills[skillName], progressionFromSkill(player.skills[skillName]));
    }
    return player.skills[skillName];
  }

  addXP(player: any, skillName: string, amount: number) {
    const skill = this.ensureSkill(player, skillName);
    const current = progressionFromSkill(skill);
    const safeAmount = Number(amount);
    if (!Number.isSafeInteger(safeAmount) || safeAmount <= 0) {
      return { skill, leveledUp: false, totalLevel: this.getTotalLevel(player) };
    }

    const advanced = advanceUnboundedProgression(current, safeAmount);
    writeProgression(skill, advanced.state);
    const leveledUp = advanced.levelsGained > 0n;

    player.xp = (player.xp || 0) + safeAmount;
    this.checkPlayerLevel(player);
    this.skillsCache.delete(player);

    return { skill, leveledUp, totalLevel: this.getTotalLevel(player) };
  }

  nextLevelXP(level: number): number {
    if (!Number.isSafeInteger(level) || level < 1) return 50;
    return projectExactToSafeNumber(xpRequiredForNextLevelExact(level)).value;
  }

  getLevel(player: any, skillName: string): number {
    return this.ensureSkill(player, skillName).level;
  }

  getTotalLevel(player: any): number {
    if (!player.skills) return SKILL_NAMES.length;
    let total = 0;
    for (const name of SKILL_NAMES) {
      total += this.ensureSkill(player, name).level;
      if (!Number.isSafeInteger(total)) return Number.MAX_SAFE_INTEGER;
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
    const cached = this.skillsCache.get(player);
    if (cached) return cached;

    const result: Record<string, SkillData> = {};
    for (const name of SKILL_NAMES) result[name] = this.ensureSkill(player, name);
    this.skillsCache.set(player, result);
    return result;
  }
}

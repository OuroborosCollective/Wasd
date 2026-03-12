export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
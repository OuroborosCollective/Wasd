export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}
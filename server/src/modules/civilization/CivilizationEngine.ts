// @ARE-GUARD-EXEMPT: Record creation timestamps; not world-state input.
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
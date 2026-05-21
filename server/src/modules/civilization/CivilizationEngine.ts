// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
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

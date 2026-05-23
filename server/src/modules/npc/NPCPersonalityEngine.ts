// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
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
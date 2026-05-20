export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(), // ARE-DETERMINISM-ALLOW
      curiosity: Math.random(), // ARE-DETERMINISM-ALLOW
      greed: Math.random(), // ARE-DETERMINISM-ALLOW
      faith: Math.random(), // ARE-DETERMINISM-ALLOW
      aggression: Math.random() // ARE-DETERMINISM-ALLOW
    };
  }
}
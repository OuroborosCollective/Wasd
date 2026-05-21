// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
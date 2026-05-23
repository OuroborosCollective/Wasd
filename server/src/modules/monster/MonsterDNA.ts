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
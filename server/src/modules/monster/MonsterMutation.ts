export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
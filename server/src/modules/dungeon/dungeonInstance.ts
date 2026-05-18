import { createARESeed, SeededARERng } from "../../core/determinism/AREDeterminism.js";

export type DungeonInstance = {
  id: string;
  seed: number;
  tier: number;
  partyId?: string;
};

let dungeonSequence = 0;

export function createDungeon(tier: number, partyId?: string): DungeonInstance {
  const sequence = dungeonSequence++;
  const seedKey = createARESeed(["dungeon", tier, partyId ?? "solo", sequence]);
  const rng = new SeededARERng(seedKey);
  const seed = rng.nextInt(1_000_000_000);
  return {
    id: `dg_${tier}_${partyId ?? "solo"}_${sequence}_${seed.toString(36)}`,
    seed,
    tier,
    ...(partyId ? { partyId } : {}),
  };
}

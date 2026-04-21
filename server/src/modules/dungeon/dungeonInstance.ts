import { randomUUID } from "node:crypto";

export type DungeonInstance = {
  id: string;
  seed: number;
  tier: number;
  partyId?: string;
};

export function createDungeon(tier: number, partyId?: string): DungeonInstance {
  return {
    id: randomUUID(),
    seed: Math.floor(Math.random() * 1e9),
    tier,
    ...(partyId ? { partyId } : {}),
  };
}

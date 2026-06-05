// Shared Live Gameplay Snapshot Types
// Server-authoritative display-only data for Quest/Guild/Faction/Map panels
// Determinism: No Date.now(), no Math.random(), no generated fake data

export type LiveDataStatus =
  | "waiting"
  | "live"
  | "empty"
  | "stale";

export interface QuestObjectiveSnapshot {
  id: string;
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestSnapshot {
  id: string;
  title: string;
  description: string;
  status: "available" | "active" | "completed" | "locked";
  objectives: QuestObjectiveSnapshot[];
}

export interface GuildSnapshot {
  id: string | null;
  name: string | null;
  memberCount: number;
  rank: string | null;
  villageEligible: boolean;
  treasury: number | null;
}

export interface FactionStandingSnapshot {
  id: string;
  name: string;
  standing: number;
  label: "hostile" | "neutral" | "trusted" | "allied";
}

export interface MapSnapshot {
  regionName: string;
  chunkX: number | null;
  chunkZ: number | null;
  visibleChunks: number | null;
  biome: string | null;
}

export interface LiveGameplaySnapshot {
  status: LiveDataStatus;
  serverTick: number | null;
  quests: QuestSnapshot[];
  guild: GuildSnapshot;
  factions: FactionStandingSnapshot[];
  map: MapSnapshot;
}

// Default empty snapshot - honest waiting state
export const EMPTY_LIVE_GAMEPLAY_SNAPSHOT: LiveGameplaySnapshot = {
  status: "waiting",
  serverTick: null,
  quests: [],
  guild: {
    id: null,
    name: null,
    memberCount: 0,
    rank: null,
    villageEligible: false,
    treasury: null,
  },
  factions: [],
  map: {
    regionName: "unknown",
    chunkX: null,
    chunkZ: null,
    visibleChunks: null,
    biome: null,
  },
};

// Normalization helper - pure function, no mutation
export function normalizeLiveGameplaySnapshot(
  input: Partial<LiveGameplaySnapshot> | null | undefined
): LiveGameplaySnapshot {
  if (!input) return EMPTY_LIVE_GAMEPLAY_SNAPSHOT;

  return {
    status: input.status ?? "waiting",
    serverTick: typeof input.serverTick === "number" ? input.serverTick : null,
    quests: Array.isArray(input.quests) ? input.quests : [],
    guild: {
      id: input.guild?.id ?? null,
      name: input.guild?.name ?? null,
      memberCount:
        typeof input.guild?.memberCount === "number"
          ? input.guild.memberCount
          : 0,
      rank: input.guild?.rank ?? null,
      villageEligible: Boolean(input.guild?.villageEligible),
      treasury:
        typeof input.guild?.treasury === "number" ? input.guild.treasury : null,
    },
    factions: Array.isArray(input.factions) ? input.factions : [],
    map: {
      regionName: input.map?.regionName ?? "unknown",
      chunkX:
        typeof input.map?.chunkX === "number" ? input.map.chunkX : null,
      chunkZ:
        typeof input.map?.chunkZ === "number" ? input.map.chunkZ : null,
      visibleChunks:
        typeof input.map?.visibleChunks === "number"
          ? input.map.visibleChunks
          : null,
      biome: input.map?.biome ?? null,
    },
  };
}
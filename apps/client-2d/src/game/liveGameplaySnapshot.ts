// Shared Live Gameplay Snapshot Types
// Server-authoritative display-only data for Quest/Skills/Guild/Faction/Map panels
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

export interface SkillSnapshot {
  id: "woodcutting" | "mining" | "fishing" | "combat" | "crafting";
  title: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;
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
  skills: SkillSnapshot[];
  guild: GuildSnapshot;
  factions: FactionStandingSnapshot[];
  map: MapSnapshot;
}

// Default empty snapshot - honest waiting state
export const EMPTY_LIVE_GAMEPLAY_SNAPSHOT: LiveGameplaySnapshot = {
  status: "waiting",
  serverTick: null,
  quests: [],
  skills: [],
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
    skills: normalizeSkills(input.skills),
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

/**
 * Normalize skill snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeSkills(input: unknown): SkillSnapshot[] {
  if (!Array.isArray(input)) return [];

  const validIds = new Set(["woodcutting", "mining", "fishing", "combat", "crafting"]);

  return input
    .filter((skill): skill is SkillSnapshot =>
      skill &&
      typeof skill === "object" &&
      typeof (skill as any).id === "string" &&
      validIds.has((skill as any).id) &&
      typeof (skill as any).level === "number" &&
      typeof (skill as any).xp === "number"
    )
    .map((skill: any) => ({
      id: skill.id,
      title: String(skill.title ?? skill.id),
      level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
      xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
      xpForNextLevel: Math.max(1, Math.floor(Number(skill.xpForNextLevel ?? 100))),
      progressRatio: Math.max(0, Math.min(1, Number(skill.progressRatio ?? 0))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
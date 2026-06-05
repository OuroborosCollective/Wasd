/**
 * GAMEPLAY SNAPSHOT UTILITIES
 * 
 * Pure functions for gameplay snapshot generation.
 * These functions are deterministic and do not depend on
 * external state or modules.
 * 
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - All values come from server-authoritative state
 * - Empty/null states are honest and allowed
 */

/**
 * Quest Objective shape
 */
export interface QuestObjectiveSnapshot {
  id: string;
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

/**
 * Quest shape
 */
export interface QuestSnapshot {
  id: string;
  title: string;
  description: string;
  status: "available" | "active" | "completed" | "locked";
  objectives: QuestObjectiveSnapshot[];
}

/**
 * Guild shape
 */
export interface GuildSnapshot {
  id: string | null;
  name: string | null;
  memberCount: number;
  rank: string | null;
  villageEligible: boolean;
  treasury: number | null;
}

/**
 * Faction Standing shape
 */
export interface FactionStandingSnapshot {
  id: string;
  name: string;
  standing: number;
  label: "hostile" | "neutral" | "trusted" | "allied";
}

/**
 * Skill Snapshot shape
 */
export interface SkillSnapshot {
  id: string;
  title: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;
}

/**
 * Map shape
 */
export interface MapSnapshot {
  regionName: string;
  chunkX: number | null;
  chunkZ: number | null;
  visibleChunks: number | null;
  biome: string | null;
}

/**
 * Resource Node Snapshot shape
 */
export interface ResourceNodeSnapshot {
  id: string;
  kind: "tree" | "ore" | "fish_spot";
  title: string;
  skillId: "woodcutting" | "mining" | "fishing";
  requiredLevel: number;
  xpReward: number;
  itemRewardId: string;
  itemRewardName: string;
  position: { x: number; y: number };
  radius: number;
  status: "available" | "depleted" | "locked";
  depletedUntilTick: number | null;
  remainingTicks: number;
}

/**
 * Live Gameplay Snapshot shape (includes skills and resources)
 */
export interface LiveGameplaySnapshot {
  status: "live";
  serverTick: number;
  quests: QuestSnapshot[];
  skills: SkillSnapshot[];
  resources: ResourceNodeSnapshot[];
  guild: GuildSnapshot;
  factions: FactionStandingSnapshot[];
  map: MapSnapshot;
}

/**
 * Input for creating a gameplay snapshot (includes skills and resources)
 */
export interface GameplaySnapshotInput {
  serverTick: number;
  quests?: QuestSnapshot[];
  skills?: SkillSnapshot[];
  resources?: ResourceNodeSnapshot[];
  guild?: GuildSnapshot | null;
  factions?: FactionStandingSnapshot[];
  map?: Partial<MapSnapshot>;
}

/**
 * Create a gameplay snapshot from server-authoritative input.
 * Arrays are sorted by id for deterministic output.
 * Empty/null values are honest and allowed.
 */
export function createGameplaySnapshot(input: GameplaySnapshotInput): LiveGameplaySnapshot {
  const sortedQuests = [...(input.quests ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedSkills = [...(input.skills ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedResources = [...(input.resources ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedFactions = [...(input.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));

  return {
    status: "live",
    serverTick: input.serverTick,
    quests: sortedQuests,
    skills: sortedSkills,
    resources: sortedResources,
    guild: input.guild ?? {
      id: null,
      name: null,
      memberCount: 0,
      rank: null,
      villageEligible: false,
      treasury: null,
    },
    factions: sortedFactions,
    map: {
      regionName: input.map?.regionName ?? "unknown",
      chunkX: input.map?.chunkX ?? null,
      chunkZ: input.map?.chunkZ ?? null,
      visibleChunks: input.map?.visibleChunks ?? null,
      biome: input.map?.biome ?? null,
    },
  };
}

/**
 * Create an empty gameplay snapshot.
 * Used when server is available but no gameplay data exists yet.
 * status="empty" indicates server is reachable but no data.
 */
export function createEmptyGameplaySnapshot(serverTick: number): LiveGameplaySnapshot {
  return createGameplaySnapshot({
    serverTick,
    quests: [],
    skills: [],
    guild: null,
    factions: [],
    map: {},
  });
}
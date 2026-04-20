import { normalizeInventoryStacks } from "../inventory/inventoryStacks.js";

/**
 * Whitelist of player fields written to disk / persistence backends.
 * Omits transient runtime fields (movement state, socket mapping, etc.).
 */
export const PLAYER_PERSIST_KEYS = [
  "id",
  "name",
  "class",
  "appearance",
  "role",
  "position",
  "level",
  "health",
  "maxHealth",
  "dead",
  "deathAt",
  "stamina",
  "maxStamina",
  "mana",
  "maxMana",
  "gold",
  "xp",
  "kills",
  "deaths",
  "quests",
  "skills",
  "inventory",
  /** UID-bound gear (Diablo-style); parallel to stackable `inventory`. */
  "gearInventory",
  "lootPity",
  "lootFilter",
  "equipment",
  "impactBusterUnlocked",
  "worldBossProgress",
  "pendingRewards",
  "voteProgress",
  "faction",
  "civilization",
  "matrixEnergy",
  "flags",
  "reputation",
  "usedChoices",
  "sceneId",
  "spawnKey",
  /** Lifetime death counter */
  "totalDeaths",
  /** Optional locked combat target (NPC id) */
  "combatTargetNpcId",
  /** Per-skill cooldown end timestamps (ms since epoch) */
  "skillCooldowns",
  /** Questline graph + feature schedule (Leinenstrang runtime) */
  "questlineRuntime",
] as const;

export type PlayerPersistKey = (typeof PLAYER_PERSIST_KEYS)[number];

export function serializePlayerForPersistence(player: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PLAYER_PERSIST_KEYS) {
    if (player[key] === undefined) continue;
    out[key] = cloneJsonSafe(player[key]);
  }
  return out;
}

function cloneJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

/** Apply saved snapshot onto a freshly created default player. */
export function mergePersistedPlayerInto(player: any, saved: Record<string, unknown> | null | undefined): void {
  if (!saved || typeof saved !== "object") return;
  for (const key of PLAYER_PERSIST_KEYS) {
    if (key === "id") continue;
    if (!(key in saved)) continue;
    const v = saved[key as string];
    if (v === undefined) continue;
    try {
      (player as any)[key] = JSON.parse(JSON.stringify(v));
    } catch {
      /* skip corrupt */
    }
  }
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!Array.isArray(player.gearInventory)) player.gearInventory = [];
  if (!player.lootPity || typeof player.lootPity !== "object") {
    player.lootPity = { killsSinceLegendary: 0, killsSinceSet: 0 };
  }
  if (!player.lootFilter || typeof player.lootFilter !== "object") {
    player.lootFilter = { showRarities: ["magic", "rare", "legendary", "set"], autoPickupStackIds: [] };
  }
  if (!player.skillCooldowns || typeof player.skillCooldowns !== "object") {
    player.skillCooldowns = {};
  }
  if (player.questlineRuntime && typeof player.questlineRuntime === "object") {
    const ql = player.questlineRuntime as { featureSchedule?: unknown[] };
    if (!Array.isArray(ql.featureSchedule)) ql.featureSchedule = [];
  }
  normalizeInventoryStacks(player);
  if (!player.equipment || typeof player.equipment !== "object") {
    player.equipment = { weapon: null, armor: null, offHand: null };
  } else {
    if (!("weapon" in player.equipment)) player.equipment.weapon = null;
    if (!("armor" in player.equipment)) player.equipment.armor = null;
    if (!("offHand" in player.equipment)) player.equipment.offHand = null;
  }
  if (typeof player.impactBusterUnlocked !== "boolean") {
    player.impactBusterUnlocked = false;
  }
  if (!player.worldBossProgress || typeof player.worldBossProgress !== "object") {
    player.worldBossProgress = {
      firstClearAt: 0,
      totalClears: 0,
      clearedDungeonIds: [],
      rewardHistory: [],
    };
  } else {
    if (!Array.isArray(player.worldBossProgress.clearedDungeonIds)) {
      player.worldBossProgress.clearedDungeonIds = [];
    }
    if (!Array.isArray(player.worldBossProgress.rewardHistory)) {
      player.worldBossProgress.rewardHistory = [];
    }
    if (typeof player.worldBossProgress.firstClearAt !== "number") {
      player.worldBossProgress.firstClearAt = 0;
    }
    if (typeof player.worldBossProgress.totalClears !== "number") {
      player.worldBossProgress.totalClears = 0;
    }
  }
  if (!Array.isArray(player.pendingRewards)) {
    player.pendingRewards = [];
  }
  if (!player.voteProgress || typeof player.voteProgress !== "object") {
    player.voteProgress = {
      lastClaimByBanner: {},
      pendingSessions: [],
      activeBuffBlocks: [],
      rewardHistory: [],
      auditLog: [],
    };
  } else {
    if (!player.voteProgress.lastClaimByBanner || typeof player.voteProgress.lastClaimByBanner !== "object") {
      player.voteProgress.lastClaimByBanner = {};
    }
    if (!Array.isArray(player.voteProgress.pendingSessions)) {
      player.voteProgress.pendingSessions = [];
    }
    if (!Array.isArray(player.voteProgress.activeBuffBlocks)) {
      player.voteProgress.activeBuffBlocks = [];
    }
    if (!Array.isArray(player.voteProgress.rewardHistory)) {
      player.voteProgress.rewardHistory = [];
    }
    if (!Array.isArray(player.voteProgress.auditLog)) {
      player.voteProgress.auditLog = [];
    }
  }
  if (!player.position || typeof player.position !== "object") {
    player.position = { x: 0, y: 0, z: 0 };
  }
  /** Restored profiles stay offline until a socket sends `login`. */
  player.isOffline = true;
  player.state = "idle";
  player.stateTimer = 0;
  player.targetPosition = null;
}

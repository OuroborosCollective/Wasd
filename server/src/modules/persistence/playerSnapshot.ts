import { normalizeInventoryStacks } from "../inventory/inventoryStacks.js";

/**
 * Whitelist of player fields written to disk / Firestore.
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
  "quests",
  "skills",
  "inventory",
  "equipment",
  "faction",
  "civilization",
  "matrixEnergy",
  "flags",
  "reputation",
  "usedChoices",
  "sceneId",
  "spawnKey",
  /** Optional locked combat target (NPC id) */
  "combatTargetNpcId",
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
  normalizeInventoryStacks(player);
  if (!player.equipment || typeof player.equipment !== "object") {
    player.equipment = { weapon: null, armor: null };
  } else {
    if (!("weapon" in player.equipment)) player.equipment.weapon = null;
    if (!("armor" in player.equipment)) player.equipment.armor = null;
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

/**
 * Unified game protocol — typed events for client↔server communication.
 * Both server and client import from here for type-safe WS messaging.
 */

// ─── Client → Server ──────────────────────────────────────────

export type ClientMsg =
  | { t: "move"; x: number; y: number }
  | { t: "attack"; targetId: string }
  | { t: "loot_take"; lootId: string }
  | { t: "quest_accept"; questId: string }
  | { t: "craft"; recipeId: string; count?: number }
  | { t: "house_place"; itemId: string; x: number; y: number; r?: number }
  | { t: "use_item"; itemId: string }
  | { t: "use_skill"; skillId: string }
  | { t: "interact"; npcId?: string }
  | { t: "set_target"; npcId: string }
  | { t: "respawn" }
  | { t: "party_create" }
  | { t: "party_invite"; targetName: string }
  | { t: "party_leave" }
  | { t: "chat_message"; text: string };

// ─── Server → Client ──────────────────────────────────────────

export type FxKind = "hit" | "crit" | "heal" | "miss" | "block" | "xp" | "gold";

export type ServerMsg =
  | { t: "fx"; at: Vec2; kind: FxKind; n?: number; color?: string }
  | { t: "toast"; kind: "ok" | "err" | "info"; text: string }
  | { t: "loot_spawned"; loot: LootNet }
  | { t: "loot_despawned"; lootId: string }
  | { t: "loot_picked"; lootId: string; items: ItemStackNet[]; gold: number }
  | { t: "inv"; items: ItemStackNet[]; gold: number; maxWeight: number; weight: number }
  | { t: "quests"; active: QuestStateNet[] }
  /** Logical world snapshot (same data the Babylon client already receives as `entity_sync` + player id). */
  | { t: "snapshot"; you: string; entities: EntityNet[]; loot: LootNet[] }
  | { t: "combat_result"; attackerId: string; targetId: string; damage: number; crit: boolean; hit: boolean; targetHp: number; targetHpMax: number; killed: boolean };

// ─── Shared data shapes ───────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface EntityNet {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  level: number;
  kind: "player" | "npc" | "monster" | "loot" | "object";
}

export interface LootNet {
  id: string;
  x: number;
  y: number;
  items: ItemStackNet[];
  gold: number;
  ownerId?: string;
  despawnAt: number;
}

export interface ItemStackNet {
  itemId: string;
  qty: number;
  name?: string;
  rarity?: string;
}

export interface QuestStateNet {
  id: string;
  title: string;
  step: number;
  done: boolean;
  progress: number;
  goal: number;
  goalText: string;
}

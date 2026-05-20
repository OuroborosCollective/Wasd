// @ARE-GUARD-EXEMPT: non-sim module
/**
 * Dual inventory: stackable rows (existing `player.inventory`) + UID gear (`player.gearInventory`).
 * Compatible with today's persistence: new fields are JSON-serialized on the player blob.
 */

export type StackItem = { id: string; quantity: number };

export type Rarity = "common" | "magic" | "rare" | "legendary" | "set";

/** UID-bound gear (Diablo-style); stats are numeric mods keyed by stat id. */
export type GearItem = {
  uid: string;
  baseId: string;
  name: string;
  rarity: Rarity;
  ilvl: number;
  stats: Record<string, number>;
  bound?: boolean;
  boundOnAcquire?: boolean;
  nonTransferable?: boolean;
  tradeable?: boolean;
  droppable?: boolean;
  setId?: string;
  legendaryPowerId?: string;
  /** Optional socket indices filled with stackable gem item ids */
  socketed?: string[];
  corruption?: CorruptionState;
};

export type CorruptionState = {
  level: number;
  locked?: boolean;
  negative?: { stat: string; value: number };
};

export type LootFilter = {
  showRarities: Array<"magic" | "rare" | "legendary" | "set">;
  autoPickupStackIds: string[];
};

export type LootPityState = {
  killsSinceLegendary: number;
  killsSinceSet: number;
};

export const defaultLootPity = (): LootPityState => ({
  killsSinceLegendary: 0,
  killsSinceSet: 0,
});

export const defaultLootFilter = (): LootFilter => ({
  showRarities: ["magic", "rare", "legendary", "set"],
  autoPickupStackIds: [],
});

/** Logical view; gold still lives on `player.gold` today. */
export type PlayerInventoryView = {
  stack: StackItem[];
  gear: GearItem[];
  gold: number;
};

export function getPlayerInventoryView(player: any): PlayerInventoryView {
  const stack: StackItem[] = [];
  if (Array.isArray(player?.inventory)) {
    for (const row of player.inventory) {
      if (!row || typeof row.id !== "string") continue;
      stack.push({
        id: row.id,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
      });
    }
  }
  const gear: GearItem[] = Array.isArray(player?.gearInventory)
    ? player.gearInventory.filter((g: any) => g && typeof g.uid === "string")
    : [];
  return { stack, gear, gold: Number(player?.gold) || 0 };
}

export function ensureDualInventoryFields(player: any): void {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!Array.isArray(player.gearInventory)) player.gearInventory = [];
  if (!player.lootPity || typeof player.lootPity !== "object") {
    player.lootPity = defaultLootPity();
  } else {
    if (typeof player.lootPity.killsSinceLegendary !== "number") player.lootPity.killsSinceLegendary = 0;
    if (typeof player.lootPity.killsSinceSet !== "number") player.lootPity.killsSinceSet = 0;
  }
  if (!player.lootFilter || typeof player.lootFilter !== "object") {
    player.lootFilter = defaultLootFilter();
  }
}

export function addGearToPlayer(player: any, item: GearItem): void {
  ensureDualInventoryFields(player);
  if (!item?.uid) return;
  if (player.gearInventory.some((g: GearItem) => g.uid === item.uid)) return;
  player.gearInventory.push(item);
}

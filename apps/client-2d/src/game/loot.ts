import type { ServerResultBase } from "./serverContract";

export interface LootPickupResult extends ServerResultBase {
  entityId?: string;
  itemId?: string;
  quantity?: number;
}

export interface LootFeedEntry {
  id: string;
  itemId: string;
  quantity: number;
  atTick: number;
  /** Server-provided roll hash for determinism */
  rollHash?: string;
}

export interface LootFeedStore {
  push(itemId: string, quantity: number, tick: number, rollHash?: string): void;
  getAll(): LootFeedEntry[];
  prune(nowTick: number): void;
}

/**
 * LootFeedStore - Observes server loot_delta only
 * 
 * CANONICAL PATH:
 * - Receives loot entries ONLY from server-side loot.delta events
 * - No client-side roll logic, no Math.random(), no Date.now()
 * - Entries are identified by server-provided rollHash or tick-based ID
 */
export function createLootFeedStore(maxEntries = 12): LootFeedStore {
  const entries: LootFeedEntry[] = [];

  return {
    /**
     * Push a loot entry from server loot_delta event
     * @param itemId - Server-provided item identifier
     * @param quantity - Server-provided quantity
     * @param tick - Server tick when loot was generated
     * @param rollHash - Server-provided roll hash for stable ID
     */
    push(itemId: string, quantity: number, tick: number, rollHash?: string) {
      const id = rollHash 
        ? `loot_${rollHash.slice(0, 16)}`
        : `loot_tick_${tick}_${itemId}`;
      
      entries.unshift({
        id,
        itemId,
        quantity,
        atTick: tick,
        rollHash
      });

      while (entries.length > maxEntries) {
        entries.pop();
      }
    },

    getAll() {
      return entries.map((entry) => ({ ...entry }));
    },

    /**
     * Prune entries older than 7000 ticks (approximately 7 seconds at 1000 tps)
     */
    prune(nowTick: number) {
      const EXPIRY_TICKS = 7000;
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (nowTick - entries[i].atTick > EXPIRY_TICKS) {
          entries.splice(i, 1);
        }
      }
    }
  };
}
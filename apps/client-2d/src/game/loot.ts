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
  atMs: number;
}

export interface LootFeedStore {
  push(itemId: string, quantity: number): void;
  getAll(): LootFeedEntry[];
  prune(nowMs: number): void;
}

export function createLootFeedStore(maxEntries = 12): LootFeedStore {
  const entries: LootFeedEntry[] = [];

  return {
    push(itemId, quantity) {
      entries.unshift({
        id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        itemId,
        quantity,
        atMs: Date.now()
      });

      while (entries.length > maxEntries) {
        entries.pop();
      }
    },

    getAll() {
      return entries.map((entry) => ({ ...entry }));
    },

    prune(nowMs) {
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (nowMs - entries[i].atMs > 7000) {
          entries.splice(i, 1);
        }
      }
    }
  };
}
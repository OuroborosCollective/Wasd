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
  rollHash: string;
}

export interface LootFeedStore {
  push(itemId: string, quantity: number, tick: number, rollHash?: string): void;
  getAll(): LootFeedEntry[];
  prune(nowTick: number): void;
}

const EXPIRY_TICKS = 70;

function hasServerStamp(tick: number, rollHash?: string): rollHash is string {
  return Number.isSafeInteger(tick) && tick > 0 && typeof rollHash === "string" && rollHash.trim().length > 0;
}

export function createLootFeedStore(maxEntries = 12): LootFeedStore {
  const entries: LootFeedEntry[] = [];
  const seen = new Set<string>();

  return {
    push(itemId: string, quantity: number, tick: number, rollHash?: string) {
      if (!hasServerStamp(tick, rollHash)) return;
      const id = `loot_${rollHash.slice(0, 32)}`;
      if (seen.has(id)) return;
      entries.unshift({ id, itemId, quantity: Math.max(1, Math.trunc(quantity || 1)), atTick: tick, rollHash });
      seen.add(id);
      while (entries.length > maxEntries) {
        const removed = entries.pop();
        if (removed) seen.delete(removed.id);
      }
    },

    getAll() {
      return entries.map((entry) => ({ ...entry }));
    },

    prune(nowTick: number) {
      if (!Number.isSafeInteger(nowTick) || nowTick <= 0) return;
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (nowTick - entries[i].atTick > EXPIRY_TICKS) {
          const [removed] = entries.splice(i, 1);
          if (removed) seen.delete(removed.id);
        }
      }
    }
  };
}

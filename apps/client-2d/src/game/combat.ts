import type { CombatResultPayload } from "../net/protocol";

const COMBAT_TICK_MS = 100;

export interface CombatLogEntry {
  id: string;
  atTick: number;
  text: string;
  kind: CombatResultPayload["kind"];
  atMs: number;
}

export interface CombatLogStore {
  push(result: CombatResultPayload): void;
  getAll(): CombatLogEntry[];
  clear(): void;
}

export function createCombatLogStore(maxEntries = 30): CombatLogStore {
  const entries: CombatLogEntry[] = [];

  return {
    push(result) {
      const amount = result.amount ?? 0;
      const atTick = Number.isFinite(result.atTick) && result.atTick >= 0 ? Math.trunc(result.atTick) : 0;

      const text =
        result.kind === "damage"
          ? `Damage ${amount}`
          : result.kind === "heal"
            ? `Heal ${amount}`
            : result.kind.toUpperCase();

      entries.unshift({
        id: result.id,
        atTick,
        text,
        kind: result.kind,
        atMs: atTick * COMBAT_TICK_MS
      });

      while (entries.length > maxEntries) {
        entries.pop();
      }
    },

    getAll() {
      return entries.map((entry) => ({ ...entry }));
    },

    clear() {
      entries.length = 0;
    }
  };
}

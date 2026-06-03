import type { CombatResultPayload } from "../net/protocol";

export interface CombatFxInstance {
  id: string;
  x: number;
  y: number;
  text: string;
  ageTicks: number;
  maxAgeTicks: number;
  kind: CombatResultPayload["kind"];
}

export interface CombatFxStore {
  push(result: CombatResultPayload): void;
  step(): void;
  getAll(): CombatFxInstance[];
  clear(): void;
}

export function createCombatFxStore(): CombatFxStore {
  const effects: CombatFxInstance[] = [];

  return {
    push(result) {
      const text =
        result.kind === "damage"
          ? `-${result.amount ?? "?"}`
          : result.kind === "heal"
            ? `+${result.amount ?? "?"}`
            : result.kind.toUpperCase();

      effects.push({
        id: result.id,
        x: result.x,
        y: result.y,
        text,
        ageTicks: 0,
        maxAgeTicks: 12,
        kind: result.kind
      });
    },

    step() {
      for (const effect of effects) {
        effect.ageTicks += 1;
        effect.y -= 2;
      }

      for (let i = effects.length - 1; i >= 0; i -= 1) {
        if (effects[i].ageTicks >= effects[i].maxAgeTicks) {
          effects.splice(i, 1);
        }
      }
    },

    getAll() {
      return effects.map((effect) => ({ ...effect }));
    },

    clear() {
      effects.length = 0;
    }
  };
}
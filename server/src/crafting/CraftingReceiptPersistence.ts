import { createHash } from "node:crypto";
import type { PlayerInventoryState } from "../inventory/InventoryTypes.js";
import type { PlayerSkillState } from "../skills/SkillTypes.js";

export type CraftingReceiptStatus = "prepared" | "committed";

export interface PersistedCraftingReceipt {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly playerId: string;
  readonly recipeId: string;
  readonly craftHash: string;
  readonly originUids: readonly string[];
  readonly status: CraftingReceiptStatus;
  readonly inventoryBefore: PlayerInventoryState;
  readonly appliedOriginUidsBefore: readonly string[];
  readonly movementEventCountBefore: number;
  readonly skillsBefore: PlayerSkillState;
  readonly expectedCraftingXpAfter: number;
  readonly receiptHash: string;
}

export interface CraftingReceiptPersistenceAdapter {
  loadReceipt(operationId: string): Promise<PersistedCraftingReceipt | null>;
  saveReceipt(receipt: PersistedCraftingReceipt): Promise<void>;
  deleteReceipt(operationId: string): Promise<void>;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function craftingReceiptHash(input: Omit<PersistedCraftingReceipt, "receiptHash">): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

export function createCraftingReceipt(
  input: Omit<PersistedCraftingReceipt, "schemaVersion" | "receiptHash">,
): PersistedCraftingReceipt {
  const base = Object.freeze({
    schemaVersion: 1 as const,
    ...input,
    originUids: Object.freeze([...input.originUids]),
    appliedOriginUidsBefore: Object.freeze([...input.appliedOriginUidsBefore]),
    inventoryBefore: Object.freeze({
      ...input.inventoryBefore,
      slots: Object.freeze(input.inventoryBefore.slots.map((slot) => Object.freeze({ ...slot }))),
    }),
    skillsBefore: Object.freeze({
      ...input.skillsBefore,
      skills: Object.freeze(input.skillsBefore.skills.map((skill) => Object.freeze({ ...skill }))),
    }),
  });
  return Object.freeze({ ...base, receiptHash: craftingReceiptHash(base) });
}

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultInventoryState } from "../../inventory/InventoryTypes.js";
import { createDefaultPlayerSkillState } from "../../skills/SkillTypes.js";
import { createCraftingReceipt } from "../../crafting/CraftingReceiptPersistence.js";
import { JsonCraftingReceiptPersistenceAdapter } from "../../crafting/JsonCraftingReceiptPersistenceAdapter.js";

const temporaryRoots: string[] = [];

async function createPersistentAdapter(): Promise<{ adapter: JsonCraftingReceiptPersistenceAdapter; filePath: string }> {
  const root = await mkdtemp(path.join(tmpdir(), "areloria-crafting-receipt-"));
  temporaryRoots.push(root);
  const filePath = path.join(root, "state", "crafting-receipts.json");
  return { adapter: new JsonCraftingReceiptPersistenceAdapter(filePath), filePath };
}

function createAuthoritativeReceipt(operationId = "intent:craft:receipt-rehydrate:420") {
  const playerId = "crafting-receipt-player";
  return createCraftingReceipt({
    operationId,
    playerId,
    recipeId: "craft_wood_plank",
    craftHash: "craft:hash:420",
    originUids: ["craft:intent:craft:receipt-rehydrate:420:output:0"],
    status: "committed",
    inventoryBefore: createDefaultInventoryState(playerId),
    appliedOriginUidsBefore: [],
    movementEventCountBefore: 0,
    skillsBefore: createDefaultPlayerSkillState(playerId),
    expectedCraftingXpAfter: 25,
  });
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("JsonCraftingReceiptPersistenceAdapter", () => {
  it("rehydrates the same authoritative receipt and hash after adapter restart", async () => {
    const { adapter, filePath } = await createPersistentAdapter();
    const receipt = createAuthoritativeReceipt();
    await adapter.saveReceipt(receipt);

    const afterRestart = new JsonCraftingReceiptPersistenceAdapter(filePath);
    const restored = await afterRestart.loadReceipt(receipt.operationId);

    expect(restored).toEqual(receipt);
    const persisted = JSON.parse(await readFile(filePath, "utf8"));
    expect(persisted.receipts).toHaveLength(1);
    expect(persisted.receipts[0].receiptHash).toBe(receipt.receiptHash);
  });

  it("rejects a persisted receipt whose stored hash no longer matches its authoritative fields", async () => {
    const { adapter, filePath } = await createPersistentAdapter();
    const receipt = createAuthoritativeReceipt();
    await adapter.saveReceipt(receipt);

    const persisted = JSON.parse(await readFile(filePath, "utf8"));
    persisted.receipts[0].receiptHash = "0".repeat(64);
    await writeFile(filePath, `${JSON.stringify(persisted)}\n`, "utf8");

    const afterRestart = new JsonCraftingReceiptPersistenceAdapter(filePath);
    await expect(afterRestart.loadReceipt(receipt.operationId)).rejects.toThrow("invalid_crafting_receipt_hash");
  });

  it("rejects an unsupported persisted schema instead of silently reinterpreting it", async () => {
    const { filePath } = await createPersistentAdapter();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify({ schemaVersion: 2, receipts: [] }), "utf8");

    const afterRestart = new JsonCraftingReceiptPersistenceAdapter(filePath);
    await expect(afterRestart.loadReceipt("intent:craft:unsupported-schema")).rejects.toThrow("invalid_crafting_receipt_schema");
  });
});

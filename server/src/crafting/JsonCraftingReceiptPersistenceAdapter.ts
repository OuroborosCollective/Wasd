import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CraftingReceiptPersistenceAdapter,
  PersistedCraftingReceipt,
} from "./CraftingReceiptPersistence.js";
import { createCraftingReceipt } from "./CraftingReceiptPersistence.js";

interface CraftingReceiptFile {
  readonly schemaVersion: 1;
  readonly receipts: readonly PersistedCraftingReceipt[];
}

function resolveFilePath(): string {
  return process.env.CRAFTING_RECEIPT_STATE_FILE
    ? path.resolve(process.env.CRAFTING_RECEIPT_STATE_FILE)
    : path.resolve(process.cwd(), "data", "crafting-receipts.json");
}

function normalizeReceipt(value: PersistedCraftingReceipt): PersistedCraftingReceipt {
  if (value.schemaVersion !== 1) {
    throw new Error("invalid_crafting_receipt_schema");
  }
  const normalized = createCraftingReceipt({
    operationId: String(value.operationId),
    playerId: String(value.playerId),
    recipeId: String(value.recipeId),
    craftHash: String(value.craftHash),
    originUids: [...(value.originUids ?? [])].map(String).sort(),
    status: value.status === "committed" ? "committed" : "prepared",
    inventoryBefore: value.inventoryBefore,
    appliedOriginUidsBefore: [...(value.appliedOriginUidsBefore ?? [])].map(String).sort(),
    movementEventCountBefore: Math.max(0, Math.floor(Number(value.movementEventCountBefore ?? 0))),
    skillsBefore: value.skillsBefore,
    expectedCraftingXpAfter: Math.max(0, Math.floor(Number(value.expectedCraftingXpAfter ?? 0))),
  });
  if (typeof value.receiptHash !== "string" || value.receiptHash !== normalized.receiptHash) {
    throw new Error("invalid_crafting_receipt_hash");
  }
  return normalized;
}

function stableFile(receipts: readonly PersistedCraftingReceipt[]): CraftingReceiptFile {
  return Object.freeze({
    schemaVersion: 1 as const,
    receipts: Object.freeze(
      receipts
        .map(normalizeReceipt)
        // Bolt: Optimization - Direct relational comparison (a < b ? -1 : a > b ? 1 : 0) is faster than localeCompare
        .sort((a, b) => (a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0)),
    ),
  });
}

export class JsonCraftingReceiptPersistenceAdapter implements CraftingReceiptPersistenceAdapter {
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(private readonly filePath: string = resolveFilePath()) {}

  public async loadReceipt(operationId: string): Promise<PersistedCraftingReceipt | null> {
    await this.writeTail;
    const file = await this.readFileState();
    return file.receipts.find((receipt) => receipt.operationId === operationId) ?? null;
  }

  public async saveReceipt(receipt: PersistedCraftingReceipt): Promise<void> {
    const write = this.writeTail.then(async () => {
      const file = await this.readFileState();
      const normalized = normalizeReceipt(receipt);
      await this.writeFileState(stableFile([
        ...file.receipts.filter((entry) => entry.operationId !== normalized.operationId),
        normalized,
      ]));
    });
    this.writeTail = write.catch(() => undefined);
    await write;
  }

  public async deleteReceipt(operationId: string): Promise<void> {
    const write = this.writeTail.then(async () => {
      const file = await this.readFileState();
      if (!file.receipts.some((entry) => entry.operationId === operationId)) return;
      await this.writeFileState(stableFile(file.receipts.filter((entry) => entry.operationId !== operationId)));
    });
    this.writeTail = write.catch(() => undefined);
    await write;
  }

  private async writeFileState(file: CraftingReceiptFile): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }

  private async readFileState(): Promise<CraftingReceiptFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<CraftingReceiptFile>;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.receipts)) {
        throw new Error("invalid_crafting_receipt_schema");
      }
      return stableFile(parsed.receipts);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return stableFile([]);
      throw error;
    }
  }
}

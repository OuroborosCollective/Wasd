/**
 * JSON VENDOR STOCK PERSISTENCE ADAPTER
 *
 * File-based vendor stock persistence for development/testing.
 * Atomic writes ensure data integrity.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedVendorStockState,
  type VendorStockPersistenceAdapter,
  type PersistedVendorStockState,
} from "./VendorStockPersistence.js";
import type { VendorStockState } from "./VendorStockTypes.js";

interface StockFile {
  schemaVersion: 1;
  vendors: PersistedVendorStockState[];
}

function stableFile(vendors: PersistedVendorStockState[]): StockFile {
  return {
    schemaVersion: 1,
    vendors: [...vendors].sort((a, b) => a.vendorId.localeCompare(b.vendorId)),
  };
}

export function resolveVendorStockStateFilePath(): string {
  return process.env.VENDOR_STOCK_STATE_FILE
    ? path.resolve(process.env.VENDOR_STOCK_STATE_FILE)
    : path.resolve(process.cwd(), "data", "vendor-stock-state.json");
}

export class JsonVendorStockPersistenceAdapter implements VendorStockPersistenceAdapter {
  constructor(private readonly filePath = resolveVendorStockStateFilePath()) {}

  async loadStock(vendorId: string): Promise<PersistedVendorStockState | null> {
    const file = await this.readFileSafe();
    const found = file.vendors.find((v) => v.vendorId === vendorId);
    return found ?? null;
  }

  async saveStock(state: PersistedVendorStockState): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedVendorStockState(state.vendorId, state);
    const withoutVendor = file.vendors.filter((v) => v.vendorId !== normalized.vendorId);
    await this.writeFileAtomic(stableFile([...withoutVendor, normalized]));
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      return { ok: true, driver: "json" };
    } catch (error) {
      return {
        ok: false,
        driver: "json",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readFileSafe(): Promise<StockFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StockFile>;

      return stableFile(
        Array.isArray(parsed.vendors)
          ? parsed.vendors.map((v) => createPersistedVendorStockState(v.vendorId, v as VendorStockState))
          : [],
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: StockFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}
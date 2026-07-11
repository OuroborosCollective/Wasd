import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CampStockStateSnapshot } from "./CampNpcService.js";
import type { CampStockPersistenceAdapter } from "./CampStockPersistence.js";

interface CampStockFileEntry {
  readonly poiId: string;
  readonly items: Readonly<Record<string, number>>;
  readonly lastProcessedCycle: number;
}

interface CampStockFile {
  readonly schemaVersion: 1;
  readonly stocks: readonly CampStockFileEntry[];
}

function resolveFilePath(): string {
  return process.env.CAMP_STOCK_STATE_FILE
    ? path.resolve(process.env.CAMP_STOCK_STATE_FILE)
    : path.resolve(process.cwd(), "data", "camp-stock-state.json");
}

function normalizeState(state: CampStockStateSnapshot): CampStockStateSnapshot {
  const entries: Array<readonly [string, number]> = Object.entries(state.items)
    .map(([itemId, quantity]): readonly [string, number] => [
      String(itemId),
      Math.max(0, Math.floor(Number(quantity))),
    ])
    .filter((entry) => entry[1] > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const items: Record<string, number> = Object.fromEntries(entries);
  return Object.freeze({
    items: Object.freeze(items),
    lastProcessedCycle: Number.isSafeInteger(state.lastProcessedCycle)
      ? state.lastProcessedCycle
      : -1,
  });
}

function stableFile(stocks: readonly CampStockFileEntry[]): CampStockFile {
  return Object.freeze({
    schemaVersion: 1 as const,
    stocks: Object.freeze(
      stocks
        .map((entry) => ({
          poiId: String(entry.poiId),
          ...normalizeState(entry),
        }))
        .sort((a, b) => a.poiId.localeCompare(b.poiId)),
    ),
  });
}

export class JsonCampStockPersistenceAdapter implements CampStockPersistenceAdapter {
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(private readonly filePath: string = resolveFilePath()) {}

  public async loadStockState(poiId: string): Promise<CampStockStateSnapshot | null> {
    await this.writeTail;
    const file = await this.readStateFile();
    const entry = file.stocks.find((candidate) => candidate.poiId === poiId);
    return entry ? normalizeState(entry) : null;
  }

  public async saveStockState(poiId: string, state: CampStockStateSnapshot | null): Promise<void> {
    const write = this.writeTail.then(async () => {
      const file = await this.readStateFile();
      const remaining = file.stocks.filter((entry) => entry.poiId !== poiId);
      const next = state
        ? stableFile([...remaining, { poiId, ...normalizeState(state) }])
        : stableFile(remaining);
      const directory = path.dirname(this.filePath);
      await mkdir(directory, { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      await rename(temporaryPath, this.filePath);
    });
    this.writeTail = write.catch(() => undefined);
    await write;
  }

  private async readStateFile(): Promise<CampStockFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<CampStockFile>;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.stocks)) {
        throw new Error("invalid_camp_stock_state_schema");
      }
      return stableFile(parsed.stocks);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return stableFile([]);
      throw error;
    }
  }
}

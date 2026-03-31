import fs from "fs";
import path from "path";

type PoolEntry = string | string[];

type AssetPoolDocument = {
  version?: number;
  defaults?: Record<string, PoolEntry>;
  pools?: Record<string, Record<string, PoolEntry>>;
};

const DEFAULT_POOLS_PATH = path.resolve(process.cwd(), "game-data/world/asset-pools.json");

export class AssetPoolResolver {
  private poolsPath: string;
  private document: AssetPoolDocument = { defaults: {}, pools: {} };

  constructor(poolsPath: string = DEFAULT_POOLS_PATH) {
    this.poolsPath = poolsPath;
    this.reload();
  }

  public reload() {
    if (!fs.existsSync(this.poolsPath)) {
      this.document = { defaults: {}, pools: {} };
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.poolsPath, "utf-8")) as AssetPoolDocument;
      this.document = {
        version: parsed.version ?? 1,
        defaults: parsed.defaults ?? {},
        pools: parsed.pools ?? {},
      };
    } catch (error) {
      console.error("Failed to parse asset-pools.json", error);
      this.document = { defaults: {}, pools: {} };
    }
  }

  public resolvePath(category: string | undefined, key: string | undefined, seed?: string): string | undefined {
    const normalizedCategory = this.normalizeCategory(category);
    const normalizedKey = this.normalizeToken(key);

    const categoryPool = this.document.pools?.[normalizedCategory];
    if (categoryPool) {
      const entry =
        this.pickEntryByKey(categoryPool, normalizedKey) ??
        this.pickEntryByKey(categoryPool, "default");
      if (entry) {
        return this.pickVariant(entry, seed ?? `${normalizedCategory}:${normalizedKey}`);
      }
    }

    const fallbackEntry =
      this.pickEntryByKey(this.document.defaults ?? {}, normalizedCategory) ??
      this.pickEntryByKey(this.document.defaults ?? {}, "object");
    if (fallbackEntry) {
      return this.pickVariant(fallbackEntry, seed ?? normalizedCategory);
    }

    return undefined;
  }

  private pickEntryByKey(collection: Record<string, PoolEntry>, key: string): PoolEntry | undefined {
    if (!key) {
      return undefined;
    }
    if (collection[key]) {
      return collection[key];
    }
    const compact = key.replace(/_/g, "");
    const aliasKey = Object.keys(collection).find((candidate) => candidate.replace(/_/g, "") === compact);
    return aliasKey ? collection[aliasKey] : undefined;
  }

  private pickVariant(entry: PoolEntry, seed: string): string | undefined {
    if (typeof entry === "string") {
      return entry;
    }
    if (!Array.isArray(entry) || entry.length === 0) {
      return undefined;
    }
    const hash = this.hash(seed);
    const index = Math.abs(hash) % entry.length;
    return entry[index];
  }

  private normalizeCategory(category: string | undefined): string {
    const normalized = this.normalizeToken(category);
    if (!normalized) {
      return "world_objects";
    }
    if (normalized === "npc") return "npcs";
    if (normalized === "monster") return "monsters";
    if (normalized === "object" || normalized === "world" || normalized === "worldobject") return "world_objects";
    if (normalized === "resource") return "resources";
    if (normalized === "player") return "players";
    return normalized;
  }

  private normalizeToken(value: string | undefined): string {
    if (!value) return "";
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

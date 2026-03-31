import fs from "fs";
import path from "path";

export type AssetCategory =
  | "terrain"
  | "road"
  | "building"
  | "vegetation"
  | "prop"
  | "special";

export type AssetResolveInput = {
  assetCategory?: AssetCategory;
  assetKey?: string;
  objectType?: string;
  variant?: string;
  seedHint?: string;
};

type AssetPoolsConfig = {
  meta?: {
    version?: number;
    description?: string;
  };
  pools?: Partial<Record<AssetCategory | "object", string[]>>;
  aliases?: Record<string, AssetCategory | "object">;
};

const DEFAULT_CONFIG: Required<AssetPoolsConfig> = {
  meta: {
    version: 1,
    description: "Default fallback asset pool config",
  },
  pools: {
    object: ["/assets/models/objects/chest.glb"],
    terrain: [],
    road: [],
    building: [],
    vegetation: [],
    prop: [],
    special: [],
  },
  aliases: {},
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function ensurePublicGlbPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.endsWith(".glb")) return `/${trimmed}`;
  return undefined;
}

export class AssetPoolResolver {
  private readonly configPath = path.resolve(process.cwd(), "game-data/world/asset-pools.json");
  private config: Required<AssetPoolsConfig> = { ...DEFAULT_CONFIG };

  constructor() {
    this.reload();
  }

  reload(): void {
    if (!fs.existsSync(this.configPath)) {
      this.config = { ...DEFAULT_CONFIG };
      return;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.configPath, "utf-8")) as AssetPoolsConfig;
      this.config = {
        meta: raw.meta ?? DEFAULT_CONFIG.meta,
        pools: { ...DEFAULT_CONFIG.pools, ...(raw.pools ?? {}) },
        aliases: raw.aliases ?? DEFAULT_CONFIG.aliases,
      };
    } catch (error) {
      console.error("[AssetPoolResolver] Failed to parse asset-pools.json, using defaults.", error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  resolveObject(input: AssetResolveInput): string | undefined {
    const category = input.assetCategory ?? this.resolveCategory(input.assetKey, input.objectType);
    const pool = this.config.pools[category] ?? [];
    const fallbackPool = this.config.pools.object ?? DEFAULT_CONFIG.pools.object ?? [];
    const basePool = Array.isArray(pool) && pool.length > 0 ? pool : fallbackPool;
    const mergedPool = basePool
      .map((entry) => ensurePublicGlbPath(entry))
      .filter((entry): entry is string => Boolean(entry));

    if (mergedPool.length === 0) {
      return undefined;
    }

    const seed = `${category}:${input.assetKey || input.objectType || "object"}:${input.variant || ""}:${input.seedHint || ""}`;
    const index = deterministicHash(seed) % mergedPool.length;
    return mergedPool[index] ?? mergedPool[0];
  }

  private resolveCategory(assetKey?: string, objectType?: string): AssetCategory | "object" {
    const candidates = [assetKey, objectType]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map(normalizeKey);
    for (const key of candidates) {
      const alias = this.config.aliases[key];
      if (alias && this.config.pools[alias]) {
        return alias;
      }
    }
    return "object";
  }
}

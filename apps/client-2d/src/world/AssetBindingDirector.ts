import type { AssetEntry, AssetManifest } from "../assetManifest";
import type { AssetBindingContext } from "./AssetBindingContext";
import type { SemanticQuery } from "./AssetSemanticProfiles";
import { combineSeed, hash32, pickWeightedDeterministic, type WeightedEntry } from "./DeterministicAssetRng";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import { deterministicAssetBindingId } from "./AssetBindingDirectorIds";

export interface ScoredAsset {
  readonly id: string;
  readonly entry: AssetEntry;
  readonly score: number;
  readonly matchReasons: readonly string[];
}

export interface BindingResult {
  readonly id: string;
  readonly entry: AssetEntry | null;
  readonly debug: BindingDebug;
}

export interface BindingDebug {
  readonly seed: string;
  readonly semanticType: string;
  readonly candidates: number;
  readonly scores: readonly { id: string; score: number; reasons: readonly string[] }[];
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly finalScore: number;
}

type ManifestBucket = "tilesets" | "characters" | "buildings" | "props";

const SCORE = {
  base: 20,
  kind: 100,
  group: 50,
  semantic: 35,
  tag: 15,
  biome: 20,
  culture: 15,
  faction: 25,
  lod: 10,
  quality: 2,
};

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function entryText(entry: AssetEntry): string {
  return [
    entry.id,
    entry.src,
    entry.source,
    entry.sourcePath,
    entry.sourceName,
    entry.kind,
    entry.group,
    entry.category,
    ...(entry.tags ?? []),
    ...(entry.biomeTags ?? []),
    ...(entry.cultureTags ?? []),
    ...(entry.factionTags ?? []),
  ].map(lower).filter(Boolean).join("|");
}

function containsAny(entry: AssetEntry, values: readonly unknown[]): boolean {
  const haystack = entryText(entry);
  return values.map(lower).filter(Boolean).some((value) => haystack.includes(value));
}

function sizeOf(entry: AssetEntry): { width: number; height: number } {
  return {
    width: entry.width ?? entry.frame?.w ?? entry.frameWidth ?? entry.tileWidth ?? 32,
    height: entry.height ?? entry.frame?.h ?? entry.frameHeight ?? entry.tileHeight ?? 32,
  };
}

function validForBucket(id: string, entry: AssetEntry | null | undefined, bucket: ManifestBucket): boolean {
  if (!entry?.src) return false;
  if (entry.src.toLowerCase().endsWith(".json")) return false;
  if (entry.deprecated || entry.corrupt) return false;

  const haystack = entryText({ ...entry, id });
  const artifactTokens = ["alphabet", "letters", "glyph", "symbol", "font", "sheet", "preview", "label", "text", "ui"];
  if (artifactTokens.some((token) => haystack.includes(token))) return false;
  if (/\bnc_\d/.test(lower(id)) || /\bnc_[a-z]/.test(lower(id))) return false;

  if (bucket === "tilesets") {
    return entry.category === "tilesets" && (entry.meta as any)?.usableAsProp !== true;
  }

  if (bucket === "props") {
    if (entry.category === "tilesets") return false;
    if ((entry.meta as any)?.usableAsTile === true || (entry.meta as any)?.usableAsProp === false) return false;
    const kind = lower(entry.kind);
    if (kind === "deco" || kind === "petal") return false;
    const size = sizeOf(entry);
    if (size.width < 16 || size.height < 16) return false;
    if (kind === "tree") return size.width <= 384 && size.height <= 384;
    return size.width <= 256 && size.height <= 256;
  }

  if (bucket === "buildings") {
    if (entry.category === "props" || entry.category === "tilesets") return false;
    return entry.category === "buildings" || containsAny(entry, ["building", "house", "hut", "tower", "castle", "shop", "inn"]);
  }

  if (entry.category === "props" || entry.category === "tilesets") return false;
  if ((entry.meta as any)?.usableAsProp === true || (entry.meta as any)?.usableAsTile === true) return false;
  const size = sizeOf(entry);
  return size.width >= 16 && size.height >= 16 && size.width <= 512 && size.height <= 512;
}

function collectBucket(manifest: AssetManifest | null, bucket: ManifestBucket): [string, AssetEntry][] {
  const group = manifest?.[bucket] as Record<string, AssetEntry> | undefined;
  if (!group) return [];
  return Object.entries(group).filter(([id, entry]) => validForBucket(id, entry, bucket));
}

function semanticTags(query: SemanticQuery): readonly string[] {
  return Array.isArray(query.tags) ? query.tags : [];
}

export class AssetBindingDirector {
  private manifest: AssetManifest | null;
  private debugMode: boolean;

  constructor(manifest: AssetManifest | null, debugMode = false) {
    this.manifest = manifest;
    this.debugMode = debugMode;
  }

  setManifest(manifest: AssetManifest | null): void {
    this.manifest = manifest;
  }

  setDebugMode(debugMode: boolean): void {
    this.debugMode = debugMode;
  }

  scoreAsset(entry: AssetEntry, query: SemanticQuery, context: AssetBindingContext): ScoredAsset {
    const id = deterministicAssetBindingId(entry, query, context);
    const normalizedEntry: AssetEntry = { ...entry, id };
    const reasons: string[] = [];
    let score = SCORE.base;

    const kind = lower(entry.kind);
    const group = lower(entry.group);
    const semantic = lower(query.semanticType);
    const queryKind = lower(query.kind);

    if (kind && (kind === queryKind || kind === semantic)) {
      score += SCORE.kind;
      reasons.push("kind");
    }
    if (group && (group === semantic || group === queryKind)) {
      score += SCORE.group;
      reasons.push("group");
    }
    if (containsAny(normalizedEntry, [semantic, queryKind])) {
      score += SCORE.semantic;
      reasons.push("semantic");
    }
    for (const tag of semanticTags(query)) {
      if (containsAny(normalizedEntry, [tag])) {
        score += SCORE.tag;
        reasons.push(`tag:${tag}`);
      }
    }
    if (context.biome && containsAny(normalizedEntry, [context.biome])) {
      score += SCORE.biome;
      reasons.push("biome");
    }
    if (context.culture && containsAny(normalizedEntry, [context.culture])) {
      score += SCORE.culture;
      reasons.push("culture");
    }
    if (context.factionId && containsAny(normalizedEntry, [context.factionId])) {
      score += SCORE.faction;
      reasons.push("faction");
    }
    if (entry.lod && context.lod && entry.lod === context.lod) {
      score += SCORE.lod;
      reasons.push("lod");
    }
    if (Number.isFinite(entry.quality)) {
      score += Math.max(0, Math.trunc(entry.quality ?? 0)) * SCORE.quality;
      reasons.push("quality");
    }

    const tieBreaker = hash32(combineSeed(context.seed, query.semanticType, id)) % 997;
    return { id, entry: normalizedEntry, score: score * 1000 + tieBreaker, matchReasons: reasons };
  }

  collectCandidates(category: string): [string, AssetEntry][] {
    if (category === "tilesets" || category === "characters" || category === "buildings" || category === "props") {
      return collectBucket(this.manifest, category);
    }
    return [];
  }

  selectBestCandidate(seed: string, candidates: readonly ScoredAsset[], topN = 8): ScoredAsset | null {
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const top = sorted.slice(0, Math.min(topN, sorted.length));
    const weighted: WeightedEntry<ScoredAsset>[] = top.map((item, index) => ({ item, weight: top.length - index }));
    return pickWeightedDeterministic(seed, weighted) ?? top[0] ?? null;
  }

  bindRoad(roadType: RoadType, context: AssetBindingContext): BindingResult {
    return this.bind("road", String(roadType), "tilesets", context, {
      semanticType: String(roadType),
      kind: "road",
      tags: ["road", String(roadType)],
    } as SemanticQuery);
  }

  bindBuilding(buildingType: BuildingType, context: AssetBindingContext): BindingResult {
    return this.bind("building", String(buildingType), "buildings", context, {
      semanticType: String(buildingType),
      kind: String(buildingType),
      tags: ["building", String(buildingType)],
    } as SemanticQuery);
  }

  bindProp(propType: PropType, context: AssetBindingContext): BindingResult {
    return this.bind("prop", String(propType), "props", context, {
      semanticType: String(propType),
      kind: String(propType),
      tags: ["prop", String(propType)],
    } as SemanticQuery);
  }

  bindNpc(role: NpcRole, context: AssetBindingContext): BindingResult {
    const kind = role === "animal" ? "animal" : "npc";
    return this.bind("npc", String(role), "characters", context, {
      semanticType: String(role),
      kind,
      tags: [kind, String(role)],
    } as SemanticQuery);
  }

  private bind(subject: string, semanticType: string, bucket: ManifestBucket, context: AssetBindingContext, query: SemanticQuery): BindingResult {
    const seed = combineSeed(subject, semanticType, String(context.seed));
    const candidates = collectBucket(this.manifest, bucket);
    const scored = candidates.map(([id, entry]) => this.scoreAsset({ ...entry, id: entry.id ?? id }, query, context));
    const best = this.selectBestCandidate(seed, scored, 10);

    if (!best) {
      return {
        id: `empty:${semanticType}:${hash32(seed).toString(16).padStart(8, "0")}`,
        entry: null,
        debug: { seed, semanticType, candidates: 0, scores: [], fallbackUsed: true, fallbackReason: `no valid ${bucket} candidates`, finalScore: 0 },
      };
    }

    if (this.debugMode) console.debug(`[AssetBindingDirector] ${semanticType} -> ${best.id}`);
    return {
      id: best.id,
      entry: best.entry,
      debug: {
        seed,
        semanticType,
        candidates: candidates.length,
        scores: scored.sort((a, b) => b.score - a.score).slice(0, 10).map((item) => ({ id: item.id, score: item.score, reasons: item.matchReasons })),
        fallbackUsed: false,
        finalScore: best.score,
      },
    };
  }
}

export function createAssetBindingDirector(manifest: AssetManifest | null, debugMode = false): AssetBindingDirector {
  return new AssetBindingDirector(manifest, debugMode);
}

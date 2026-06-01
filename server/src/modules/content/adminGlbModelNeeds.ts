import path from "node:path";
import type { GLBLink } from "../asset-registry/GLBRegistry.js";

type PoolEntry = string | string[];

type AssetPoolDocument = {
  defaults?: Record<string, PoolEntry>;
  pools?: Record<string, Record<string, PoolEntry>>;
};

type MissingModelRef = {
  urlPath: string;
  source: string;
};

export type AdminGlbModelNeed = {
  id: string;
  kind: "missing_content_model" | "logical_model";
  category: string;
  descriptionDe: string;
  reasonDe: string;
  suggestedFileName: string;
  suggestedFolder: string;
  suggestedRelativePath: string;
  suggestedUrlPath: string;
  targetType: GLBLink["targetType"] | null;
  targetId: string | null;
  source: string | null;
  status: "needed" | "satisfied";
  satisfiedBy: "content_reference" | "glb_link" | "asset_pool" | null;
};

export type AdminGlbModelNeedsResult = {
  generatedAtIso: string;
  stats: {
    neededCount: number;
    satisfiedCount: number;
    missingContentCount: number;
    logicalSuggestionCount: number;
  };
  needs: AdminGlbModelNeed[];
  satisfied: AdminGlbModelNeed[];
};

type BuildNeedsInput = {
  missingModels: MissingModelRef[];
  modelUrls: string[];
  links: GLBLink[];
  pools: AssetPoolDocument;
  objectTypes: string[];
};

type LogicalSuggestionTemplate = {
  id: string;
  targetType: GLBLink["targetType"];
  targetId: string;
  category: string;
  suggestedRelativePath: string;
  descriptionDe: string;
  reasonDe: string;
  triggerTokens: string[];
};

const LOGICAL_SUGGESTION_TEMPLATES: LogicalSuggestionTemplate[] = [
  {
    id: "logical:road_left",
    targetType: "object_group",
    targetId: "road_left",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/road_left.glb",
    descriptionDe: "Straßen-Segment: Links-Abzweig/Kurve links.",
    reasonDe:
      "Wenn Road-Typen genutzt werden, hilft eine explizite Left-Variante für modulare Strecken.",
    triggerTokens: ["road", "street", "path"],
  },
  {
    id: "logical:road_right",
    targetType: "object_group",
    targetId: "road_right",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/road_right.glb",
    descriptionDe: "Straßen-Segment: Rechts-Abzweig/Kurve rechts.",
    reasonDe:
      "Wenn Road-Typen genutzt werden, hilft eine explizite Right-Variante für modulare Strecken.",
    triggerTokens: ["road", "street", "path"],
  },
  {
    id: "logical:fence_left",
    targetType: "object_group",
    targetId: "fence_left",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/fence_left.glb",
    descriptionDe: "Zaun-Segment: linker Abschluss/Übergang.",
    reasonDe:
      "Für Zäune sind links/rechts/front Varianten im Live-Bau meist nötig.",
    triggerTokens: ["fence", "wall", "gate"],
  },
  {
    id: "logical:fence_right",
    targetType: "object_group",
    targetId: "fence_right",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/fence_right.glb",
    descriptionDe: "Zaun-Segment: rechter Abschluss/Übergang.",
    reasonDe:
      "Für Zäune sind links/rechts/front Varianten im Live-Bau meist nötig.",
    triggerTokens: ["fence", "wall", "gate"],
  },
  {
    id: "logical:fence_front",
    targetType: "object_group",
    targetId: "fence_front",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/fence_front.glb",
    descriptionDe: "Zaun-Segment: Front-/Geradeaus-Element.",
    reasonDe:
      "Für Zäune sind links/rechts/front Varianten im Live-Bau meist nötig.",
    triggerTokens: ["fence", "wall", "gate"],
  },
  {
    id: "logical:flower_blue",
    targetType: "object_group",
    targetId: "flower_blue",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/flower_blue.glb",
    descriptionDe: "Vegetation: blaue Blume/Detailpflanze.",
    reasonDe:
      "Blumen-/Deko-Typen profitieren von klar benannten Farbvarianten.",
    triggerTokens: ["flower", "flora", "garden", "plant"],
  },
  {
    id: "logical:house_stairs",
    targetType: "object_group",
    targetId: "house_stairs",
    category: "world_objects",
    suggestedRelativePath: "world-assets/props/house_stairs.glb",
    descriptionDe: "Gebäude-Modul: Haus-Treppe / Treppen-Aufgang.",
    reasonDe:
      "Gebäude- und Haus-Typen benötigen oft eigene Treppen-Modelle für begehbare Übergänge.",
    triggerTokens: ["house", "building", "stairs", "stair", "home"],
  },
];

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePath(raw: string): string {
  return raw.trim().replace(/\\/g, "/");
}

function toArray(entry: PoolEntry | undefined): string[] {
  if (!entry) return [];
  if (typeof entry === "string") return [entry];
  if (!Array.isArray(entry)) return [];
  return entry.map((value) => String(value));
}

function pickPoolEntry(
  pools: AssetPoolDocument,
  category: string,
  key: string,
): PoolEntry | undefined {
  const normalizedCategory = normalizeToken(category);
  const normalizedKey = normalizeToken(key);
  const categoryPool = pools.pools?.[normalizedCategory];
  if (!categoryPool) return undefined;
  if (categoryPool[normalizedKey]) return categoryPool[normalizedKey];
  const compact = normalizedKey.replace(/_/g, "");
  const aliasKey = Object.keys(categoryPool).find(
    (candidate) => candidate.replace(/_/g, "") === compact,
  );
  return aliasKey ? categoryPool[aliasKey] : undefined;
}

function objectTypeMatches(objectTypes: Set<string>, token: string): boolean {
  const normalizedToken = normalizeToken(token);
  for (const objectType of objectTypes) {
    if (objectType === normalizedToken) return true;
    if (objectType.startsWith(`${normalizedToken}_`)) return true;
    if (objectType.includes(normalizedToken)) return true;
  }
  return false;
}

function buildMissingModelNeeds(
  missingModels: MissingModelRef[],
): AdminGlbModelNeed[] {
  const dedupe = new Set<string>();
  const needs: AdminGlbModelNeed[] = [];
  for (const missing of missingModels) {
    const urlPath = normalizePath(String(missing?.urlPath ?? ""));
    if (!urlPath || dedupe.has(urlPath)) continue;
    dedupe.add(urlPath);
    const fileName = path.basename(urlPath) || "missing_model.glb";
    let relativePath = fileName;
    if (urlPath.startsWith("/assets/models/")) {
      relativePath = urlPath.slice("/assets/models/".length);
    } else if (urlPath.startsWith("/world-assets/")) {
      relativePath = `world-assets/${urlPath.slice("/world-assets/".length)}`;
    }
    const normalizedRelative = normalizePath(relativePath);
    const folder = normalizedRelative.includes("/")
      ? normalizedRelative.slice(0, normalizedRelative.lastIndexOf("/"))
      : "";
    needs.push({
      id: `missing:${urlPath}`,
      kind: "missing_content_model",
      category: "content_reference",
      descriptionDe: "Fehlende Datei aus aktivem Content-Verweis.",
      reasonDe: String(missing?.source || "Unbekannte Quelle"),
      suggestedFileName: fileName,
      suggestedFolder: folder,
      suggestedRelativePath: normalizedRelative,
      suggestedUrlPath: urlPath,
      targetType: null,
      targetId: null,
      source: typeof missing?.source === "string" ? missing.source : null,
      status: "needed",
      satisfiedBy: null,
    });
  }
  return needs;
}

function buildLogicalModelNeeds(
  input: BuildNeedsInput,
  modelSet: Set<string>,
  missingModelSet: Set<string>,
): AdminGlbModelNeed[] {
  const objectTypes = new Set(
    input.objectTypes
      .map((value) => normalizeToken(value))
      .filter((value) => value.length > 0),
  );
  const linkByTarget = new Map<string, GLBLink>();
  for (const link of input.links) {
    if (!link?.targetType || !link?.targetId) continue;
    linkByTarget.set(`${link.targetType}:${link.targetId}`, link);
  }
  const needs: AdminGlbModelNeed[] = [];
  for (const template of LOGICAL_SUGGESTION_TEMPLATES) {
    const shouldSuggest = template.triggerTokens.some((token) =>
      objectTypeMatches(objectTypes, token),
    );
    if (!shouldSuggest) continue;
    const suggestedUrlPath = `/assets/models/${normalizePath(template.suggestedRelativePath)}`;
    const targetKey = `${template.targetType}:${template.targetId}`;
    const linkedModel = linkByTarget.get(targetKey);
    const linkedModelPath = linkedModel
      ? normalizePath(linkedModel.glbPath)
      : "";
    const hasUsableLink =
      linkedModelPath.length > 0 &&
      (modelSet.has(linkedModelPath) || !missingModelSet.has(linkedModelPath));
    const poolEntry = pickPoolEntry(
      input.pools,
      template.category,
      template.targetId,
    );
    const hasUsablePoolEntry = toArray(poolEntry)
      .map((entry) => normalizePath(entry))
      .some((entry) => modelSet.has(entry) || !missingModelSet.has(entry));
    const satisfiedBy: AdminGlbModelNeed["satisfiedBy"] = hasUsableLink
      ? "glb_link"
      : hasUsablePoolEntry
        ? "asset_pool"
        : null;
    const status: AdminGlbModelNeed["status"] = satisfiedBy
      ? "satisfied"
      : "needed";
    const fileName = path.basename(template.suggestedRelativePath);
    const relativePath = normalizePath(template.suggestedRelativePath);
    const folder = relativePath.includes("/")
      ? relativePath.slice(0, relativePath.lastIndexOf("/"))
      : "";
    needs.push({
      id: template.id,
      kind: "logical_model",
      category: template.category,
      descriptionDe: template.descriptionDe,
      reasonDe: template.reasonDe,
      suggestedFileName: fileName,
      suggestedFolder: folder,
      suggestedRelativePath: relativePath,
      suggestedUrlPath,
      targetType: template.targetType,
      targetId: template.targetId,
      source: null,
      status,
      satisfiedBy,
    });
  }
  return needs;
}

export function buildAdminGlbModelNeeds(
  input: BuildNeedsInput,
): AdminGlbModelNeedsResult {
  const modelSet = new Set(
    input.modelUrls
      .map((value) => normalizePath(value))
      .filter((value) => value.length > 0),
  );
  const missingModelSet = new Set(
    input.missingModels
      .map((entry) => normalizePath(String(entry?.urlPath ?? "")))
      .filter((urlPath) => urlPath.startsWith("/")),
  );
  const missingNeeds = buildMissingModelNeeds(input.missingModels);
  const logicalNeeds = buildLogicalModelNeeds(input, modelSet, missingModelSet);
  const allNeeds = [...missingNeeds, ...logicalNeeds];
  const needs = allNeeds.filter((entry) => entry.status === "needed");
  const satisfied = allNeeds.filter((entry) => entry.status === "satisfied");
  return {
    generatedAtIso: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    stats: {
      neededCount: needs.length,
      satisfiedCount: satisfied.length,
      missingContentCount: missingNeeds.length,
      logicalSuggestionCount: logicalNeeds.length,
    },
    needs,
    satisfied,
  };
}

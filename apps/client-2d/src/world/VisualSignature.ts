/**
 * VisualSignature
 *
 * Client-neutral visual truth contract. Active runtime adapter in this change is
 * client-2d; a 3D adapter must consume this same contract instead of inventing
 * parallel visual truth.
 */

export const VISUAL_SIGNATURE_VERSION = 1 as const;
export const VISUAL_KAPPA_INVARIANT = 1000 as const;
export const VISUAL_TICK_EPOCH = 100_000 as const;

export type VisualSubjectKind = "terrain" | "road" | "building" | "prop" | "npc" | "portrait";
export type VisualRenderLayer = "terrain" | "roads" | "buildings" | "props" | "actors" | "ui";

export type NpcVisualCategory =
  | "elder_sage"
  | "blacksmith_crafter"
  | "merchant_trader"
  | "healer_mystic"
  | "guard_warrior"
  | "farmer_laborer"
  | "hunter_ranger"
  | "child_young"
  | "innkeeper_barkeep"
  | "carpenter_builder"
  | "wandering_merchant"
  | "animal_beast"
  | "generic_npc";

export interface VisualSignatureInput {
  readonly subjectKind: VisualSubjectKind;
  readonly entityId: string;
  readonly semanticType: string;
  readonly role?: string | null;
  readonly seed?: string | number | null;
  readonly worldSeed?: string | null;
  readonly worldTick?: number | null;
  readonly chunkX?: number | null;
  readonly chunkZ?: number | null;
  readonly tileX?: number | null;
  readonly tileZ?: number | null;
  readonly kappaX?: number | null;
  readonly kappaZ?: number | null;
  readonly biomeId?: string | null;
  readonly factionId?: string | null;
  readonly culture?: string | null;
  readonly stateHash?: string | null;
  readonly source?: "world-plan" | "chunk-manager" | "asset-binder" | "npc-ui" | "manifest" | "test";
}

export interface VisualSignature {
  readonly version: typeof VISUAL_SIGNATURE_VERSION;
  readonly signatureId: string;
  readonly sourceKey: string;
  readonly deterministicSeed: string;
  readonly source: NonNullable<VisualSignatureInput["source"]>;
  readonly kappa: typeof VISUAL_KAPPA_INVARIANT;
  readonly worldSeed: string;
  readonly worldTick: number;
  readonly visualEpoch: number;
  readonly stateHash: string | null;
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly tileX: number;
  readonly tileZ: number;
  readonly kappaX: number;
  readonly kappaZ: number;
  readonly subjectKind: VisualSubjectKind;
  readonly semanticType: string;
  readonly semanticRole: string;
  readonly biomeId: string;
  readonly factionId: string | null;
  readonly culture: string | null;
  readonly assetIntent: string;
  readonly spriteCategory: "tilesets" | "characters" | "buildings" | "props" | "ui";
  readonly portraitCategory: NpcVisualCategory | null;
  readonly cropProfileId: string;
  readonly shadowProfileId: string;
  readonly renderLayer: VisualRenderLayer;
  readonly zLayer: number;
  readonly paletteIndex: number;
  readonly tags: readonly string[];
  readonly hash32: string;
}

interface BindingLike {
  readonly seed: string | number;
  readonly biome?: string;
  readonly factionId?: string;
  readonly culture?: string;
  readonly variantHint?: string;
}

export function hashVisual32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicVisualIndex(seed: string, length: number): number {
  if (!Number.isFinite(length) || length <= 0) return 0;
  return hashVisual32(seed) % Math.floor(length);
}

export function getNpcVisualCategory(role: string | null | undefined): NpcVisualCategory {
  const roleKey = normalizeString(role, "generic");
  const roleMap: Record<string, NpcVisualCategory> = {
    elder: "elder_sage",
    blacksmith: "blacksmith_crafter",
    trader: "merchant_trader",
    healer: "healer_mystic",
    guard_captain: "guard_warrior",
    guard: "guard_warrior",
    farmer: "farmer_laborer",
    hunter: "hunter_ranger",
    child: "child_young",
    innkeeper: "innkeeper_barkeep",
    carpenter: "carpenter_builder",
    wandering_merchant: "wandering_merchant",
    animal: "animal_beast",
  };
  return roleMap[roleKey] ?? "generic_npc";
}

export function createNpcPortraitSignature(input: Omit<VisualSignatureInput, "subjectKind" | "semanticType"> & { readonly role: string }): VisualSignature {
  return createVisualSignature({ ...input, subjectKind: "portrait", semanticType: input.role, source: input.source ?? "npc-ui" });
}

export function createVisualSignatureFromBinding(
  subjectKind: VisualSubjectKind,
  semanticType: string,
  context: BindingLike,
  extra: Partial<Omit<VisualSignatureInput, "subjectKind" | "semanticType">> = {},
): VisualSignature {
  return createVisualSignature({
    ...extra,
    subjectKind,
    semanticType,
    entityId: extra.entityId ?? `${subjectKind}:${semanticType}:${String(context.seed)}`,
    seed: context.seed,
    biomeId: context.biome ?? extra.biomeId,
    factionId: context.factionId ?? extra.factionId,
    culture: context.culture ?? extra.culture,
    source: extra.source ?? "asset-binder",
  });
}

export function createVisualSignature(input: VisualSignatureInput): VisualSignature {
  const subjectKind = input.subjectKind;
  const semanticType = normalizeString(input.semanticType, subjectKind);
  const role = normalizeString(input.role ?? ((subjectKind === "npc" || subjectKind === "portrait") ? semanticType : null), semanticType);
  const worldSeed = normalizeString(input.worldSeed ?? input.seed, "visual-world");
  const worldTick = normalizeNonNegativeInteger(input.worldTick, 0);
  const visualEpoch = Math.floor(worldTick / VISUAL_TICK_EPOCH);
  const chunkX = normalizeInteger(input.chunkX, 0);
  const chunkZ = normalizeInteger(input.chunkZ, 0);
  const tileX = normalizeInteger(input.tileX, 0);
  const tileZ = normalizeInteger(input.tileZ, 0);
  const kappaX = normalizeInteger(input.kappaX, tileX * VISUAL_KAPPA_INVARIANT);
  const kappaZ = normalizeInteger(input.kappaZ, tileZ * VISUAL_KAPPA_INVARIANT);
  const biomeId = normalizeString(input.biomeId, "plains");
  const factionId = optionalNormalized(input.factionId);
  const culture = optionalNormalized(input.culture);
  const stateHash = optionalNormalized(input.stateHash);
  const source = input.source ?? "world-plan";
  const entityId = normalizeString(input.entityId, `${subjectKind}:${semanticType}`);
  const semanticRole = subjectKind === "npc" || subjectKind === "portrait" ? role : semanticType;
  const portraitCategory = subjectKind === "npc" || subjectKind === "portrait" ? getNpcVisualCategory(role) : null;
  const renderLayer = inferRenderLayer(subjectKind);

  const seedMaterial = [
    `v${VISUAL_SIGNATURE_VERSION}`,
    source,
    subjectKind,
    entityId,
    semanticType,
    semanticRole,
    worldSeed,
    `chunk:${chunkX}:${chunkZ}`,
    `tile:${tileX}:${tileZ}`,
    `kappa:${kappaX}:${kappaZ}:1000`,
    `biome:${biomeId}`,
    `faction:${factionId ?? "none"}`,
    `culture:${culture ?? "none"}`,
    `state:${stateHash ?? "none"}`,
    `epoch:${visualEpoch}`,
  ].join("|");

  const hash = hashVisual32(seedMaterial).toString(16).padStart(8, "0");
  const deterministicSeed = `${seedMaterial}|hash:${hash}`;

  return {
    version: VISUAL_SIGNATURE_VERSION,
    signatureId: `vsig_${hash}`,
    sourceKey: `${subjectKind}:${semanticRole}:${chunkX}:${chunkZ}:${tileX}:${tileZ}:${hash}`,
    deterministicSeed,
    source,
    kappa: VISUAL_KAPPA_INVARIANT,
    worldSeed,
    worldTick,
    visualEpoch,
    stateHash,
    chunkX,
    chunkZ,
    tileX,
    tileZ,
    kappaX,
    kappaZ,
    subjectKind,
    semanticType,
    semanticRole,
    biomeId,
    factionId,
    culture,
    assetIntent: portraitCategory ? `portrait:${portraitCategory}` : `${subjectKind}:${semanticType}`,
    spriteCategory: inferSpriteCategory(subjectKind),
    portraitCategory,
    cropProfileId: inferCropProfile(subjectKind, semanticType),
    shadowProfileId: inferShadowProfile(subjectKind, semanticType),
    renderLayer,
    zLayer: inferZLayer(renderLayer, tileX, tileZ),
    paletteIndex: deterministicVisualIndex(`${seedMaterial}:palette`, 16),
    tags: buildTags(subjectKind, semanticType, semanticRole, biomeId, factionId, culture, portraitCategory),
    hash32: hash,
  };
}

function normalizeString(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim().toLowerCase();
  return text.length > 0 ? text.replace(/\s+/g, "_") : fallback;
}

function optionalNormalized(value: unknown): string | null {
  const text = normalizeString(value, "");
  return text.length > 0 ? text : null;
}

function normalizeInteger(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, normalizeInteger(value, fallback));
}

function inferRenderLayer(subjectKind: VisualSubjectKind): VisualRenderLayer {
  if (subjectKind === "terrain") return "terrain";
  if (subjectKind === "road") return "roads";
  if (subjectKind === "building") return "buildings";
  if (subjectKind === "prop") return "props";
  if (subjectKind === "portrait") return "ui";
  return "actors";
}

function inferSpriteCategory(subjectKind: VisualSubjectKind): VisualSignature["spriteCategory"] {
  if (subjectKind === "terrain" || subjectKind === "road") return "tilesets";
  if (subjectKind === "building") return "buildings";
  if (subjectKind === "prop") return "props";
  if (subjectKind === "portrait") return "ui";
  return "characters";
}

function inferCropProfile(subjectKind: VisualSubjectKind, semanticType: string): string {
  if (subjectKind === "terrain" || subjectKind === "road") return "tile_iso_96x48_anchor_center";
  if (subjectKind === "building") return "building_foot_anchor_bottom_center";
  if (subjectKind === "npc" || subjectKind === "portrait") return "actor_foot_anchor_bottom_center";
  if (semanticType === "tree") return "prop_tree_canopy_anchor_trunk";
  return "prop_object_anchor_bottom_center";
}

function inferShadowProfile(subjectKind: VisualSubjectKind, semanticType: string): string {
  if (subjectKind === "terrain" || subjectKind === "road") return "none";
  if (subjectKind === "building") return "building_soft_ellipse";
  if (subjectKind === "npc") return "actor_soft_ellipse";
  if (semanticType === "tree") return "tree_trunk_soft_ellipse";
  return "prop_soft_ellipse";
}

function inferZLayer(renderLayer: VisualRenderLayer, tileX: number, tileZ: number): number {
  const depth = Math.trunc((tileX + tileZ) * 10);
  if (renderLayer === "terrain") return -1000 + depth;
  if (renderLayer === "roads") return -900 + depth;
  if (renderLayer === "buildings") return 100 + depth;
  if (renderLayer === "props") return 200 + depth;
  if (renderLayer === "actors") return 300 + depth;
  return 1000;
}

function buildTags(subjectKind: VisualSubjectKind, semanticType: string, semanticRole: string, biomeId: string, factionId: string | null, culture: string | null, portraitCategory: NpcVisualCategory | null): readonly string[] {
  const tags = new Set<string>([subjectKind, semanticType, `biome:${biomeId}`]);
  if (semanticRole !== semanticType) tags.add(`role:${semanticRole}`);
  if (portraitCategory) tags.add(`portrait:${portraitCategory}`);
  if (factionId) tags.add(`faction:${factionId}`);
  if (culture) tags.add(`culture:${culture}`);
  return [...tags].sort();
}

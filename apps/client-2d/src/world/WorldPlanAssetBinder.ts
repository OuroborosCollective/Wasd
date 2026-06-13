/**
 * World Plan Asset Binder
 *
 * Client-only semantic asset binder. Translates world-plan roles into manifest entries.
 * Choices are seeded by plan IDs and VisualSignature metadata.
 */

import type { AssetManifest, AssetEntry } from "../assetManifest";
import { pickCharacterVisual } from "../assetManifest";
import { pickGraphicRiverBuilding, pickGraphicRiverCharacter, pickGraphicRiverProp, pickGraphicRiverTile } from "../graphicRiverIsoPicker";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import type { BoundAsset, WorldPlanAssetBinder } from "./WorldPlanRenderTypes";
import type { BindingOptions, AssetBindingContext } from "./AssetBindingContext";
import { createAssetBindingDirector, type BindingResult } from "./AssetBindingDirector";
import { combineSeed } from "./DeterministicAssetRng";
import { createVisualSignatureFromBinding, type VisualSignature, type VisualSubjectKind } from "./VisualSignature";

function isCozyContext(context?: BindingOptions | AssetBindingContext | null): boolean {
  const biome = String(context?.biome ?? "").toLowerCase();
  const hint = String(context?.variantHint ?? "").toLowerCase();
  return biome === "plains" || biome.includes("village") || hint.includes("cozy") || hint.includes("spring");
}

function isCozyEntry(entry: AssetEntry | null | undefined): boolean {
  if (!entry) return false;
  const src = String(entry.src ?? "").toLowerCase();
  const id = String(entry.id ?? "").toLowerCase();
  const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
  const biomeTags = (entry.biomeTags ?? []).map((tag) => String(tag).toLowerCase());
  return src.includes("cozy-spring") || id.includes("cozy_spring") || tags.includes("cozy-spring") || biomeTags.includes("cozy") || biomeTags.includes("spring");
}

function toBoundAsset(
  semanticType: string,
  result: BindingResult,
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
  visualSignature: VisualSignature,
): BoundAsset {
  return {
    semanticType: semanticType as BoundAsset["semanticType"],
    entry: result.entry,
    texture: result.entry ? textureFor(result.entry.src) : null,
    visualSignature,
    debug: result.debug ? {
      seed: result.debug.seed,
      semanticType: result.debug.semanticType,
      candidates: result.debug.candidates,
      topScores: result.debug.scores,
      fallbackUsed: result.debug.fallbackUsed,
      fallbackReason: result.debug.fallbackReason,
      finalScore: result.debug.finalScore,
    } : undefined,
  };
}

function withCozyLog(kind: "road" | "prop", semanticType: string, bound: BoundAsset): BoundAsset {
  if (isCozyEntry(bound.entry)) console.log(`[CozySpring] visible ${kind} ${semanticType} -> ${bound.entry?.id ?? "unknown"}`);
  return bound;
}

function signatureFor(
  subjectKind: VisualSubjectKind,
  semanticType: string,
  context: BindingOptions,
  extra?: { readonly entityId?: string; readonly worldSeed?: string; readonly worldTick?: number; readonly stateHash?: string | null; readonly tileX?: number; readonly tileZ?: number; readonly kappaX?: number; readonly kappaZ?: number },
): VisualSignature {
  return createVisualSignatureFromBinding(subjectKind, semanticType, context, {
    entityId: extra?.entityId ?? `${subjectKind}:${semanticType}:${String(context.seed)}`,
    worldSeed: extra?.worldSeed ?? String(context.seed),
    worldTick: extra?.worldTick ?? 0,
    stateHash: extra?.stateHash ?? null,
    tileX: extra?.tileX,
    tileZ: extra?.tileZ,
    kappaX: extra?.kappaX,
    kappaZ: extra?.kappaZ,
  });
}

export function createWorldPlanAssetBinder(
  manifest: AssetManifest | null,
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
  options?: { debug?: boolean },
): WorldPlanAssetBinder {
  const director = createAssetBindingDirector(manifest, options?.debug ?? false);

  const toContext = (options: BindingOptions): AssetBindingContext => ({
    seed: options.seed,
    biome: options.biome,
    factionId: options.factionId,
    culture: options.culture,
    lod: options.lod,
    wealthLevel: options.wealthLevel,
    dangerLevel: options.dangerLevel,
    worldAgePhase: options.worldAgePhase,
    variantHint: options.variantHint,
  });

  const simpleBindEntry = (semanticType: string, entry: AssetEntry | null, visualSignature: VisualSignature): BoundAsset => ({
    semanticType: semanticType as BoundAsset["semanticType"],
    entry,
    texture: entry ? textureFor(entry.src) : null,
    visualSignature,
  });

  return {
    bindRoad: (roadType: RoadType, seed?: string) => {
      const roadSeed = seed ?? roadType;
      const context: BindingOptions = { seed: roadSeed, biome: "plains", variantHint: "cozy-spring" };
      const visualSignature = signatureFor("road", roadType, context);
      const result = director.bindRoad(roadType, toContext(context));
      const cozyBound = toBoundAsset(roadType, result, textureFor, visualSignature);
      if (isCozyEntry(cozyBound.entry)) return withCozyLog("road", roadType, cozyBound);
      const grResult = pickGraphicRiverTile(manifest, visualSignature.deterministicSeed, roadKind(roadType));
      if (grResult?.entry) return simpleBindEntry(roadType, grResult.entry, visualSignature);
      return cozyBound;
    },

    bindBuilding: (buildingType: BuildingType, seed: string) => {
      const context: BindingOptions = { seed };
      const visualSignature = signatureFor("building", buildingType, context);
      const grResult = pickGraphicRiverBuilding(manifest, visualSignature.deterministicSeed, buildingKind(buildingType));
      if (grResult?.entry) return simpleBindEntry(buildingType, grResult.entry, visualSignature);
      const result = director.bindBuilding(buildingType, toContext(context));
      return toBoundAsset(buildingType, result, textureFor, visualSignature);
    },

    bindProp: (propType: PropType, seed: string) => {
      const context: BindingOptions = { seed, biome: "plains", variantHint: "cozy-spring" };
      const visualSignature = signatureFor("prop", propType, context);
      const result = director.bindProp(propType, toContext(context));
      const cozyBound = toBoundAsset(propType, result, textureFor, visualSignature);
      if (isCozyEntry(cozyBound.entry)) return withCozyLog("prop", propType, cozyBound);
      const grResult = pickGraphicRiverProp(manifest, visualSignature.deterministicSeed, propKind(propType));
      if (grResult?.entry) return simpleBindEntry(propType, grResult.entry, visualSignature);
      return cozyBound;
    },

    bindNpc: (role: NpcRole, seed: string) => {
      const context: BindingOptions = { seed };
      const visualSignature = signatureFor("npc", role, context, { entityId: `npc:${role}:${seed}` });
      const grResult = pickGraphicRiverCharacter(manifest, visualSignature.deterministicSeed, role);
      if (grResult?.entry) return simpleBindEntry(role, grResult.entry, visualSignature);
      const query = roleToCharacterQuery(role);
      const picked = pickCharacterVisual(manifest, { tags: [...query.tags], group: query.group, kind: query.kind, seed: visualSignature.deterministicSeed });
      if (picked?.entry) return simpleBindEntry(role, picked.entry, visualSignature);
      const result = director.bindNpc(role, toContext(context));
      return toBoundAsset(role, result, textureFor, visualSignature);
    },

    bindRoadWithContext: (roadType: RoadType, context: BindingOptions) => {
      const seed = combineSeed("road", String(roadType), String(context.seed));
      const nextContext: BindingOptions = { ...context, seed };
      const visualSignature = signatureFor("road", roadType, nextContext);
      if (isCozyContext(context)) {
        const result = director.bindRoad(roadType, toContext({ ...nextContext, biome: context.biome ?? "plains", variantHint: context.variantHint ?? "cozy-spring" }));
        const bound = toBoundAsset(roadType, result, textureFor, visualSignature);
        if (isCozyEntry(bound.entry)) return withCozyLog("road", roadType, bound);
      }
      const grKind = roadKind(roadType);
      const grResult = pickGraphicRiverTile(manifest, visualSignature.deterministicSeed, grKind);
      if (grResult?.entry) return simpleBindEntry(roadType, grResult.entry, visualSignature);
      const result = director.bindRoad(roadType, toContext(nextContext));
      return toBoundAsset(roadType, result, textureFor, visualSignature);
    },

    bindBuildingWithContext: (buildingType: BuildingType, context: BindingOptions) => {
      const seed = combineSeed("building", String(buildingType), String(context.seed));
      const nextContext: BindingOptions = { ...context, seed };
      const visualSignature = signatureFor("building", buildingType, nextContext);
      const grKind = buildingKind(buildingType);
      const grResult = pickGraphicRiverBuilding(manifest, visualSignature.deterministicSeed, grKind);
      if (grResult?.entry) return simpleBindEntry(buildingType, grResult.entry, visualSignature);
      const result = director.bindBuilding(buildingType, toContext(nextContext));
      return toBoundAsset(buildingType, result, textureFor, visualSignature);
    },

    bindPropWithContext: (propType: PropType, context: BindingOptions) => {
      const seed = combineSeed("prop", String(propType), String(context.seed));
      const nextContext: BindingOptions = { ...context, seed };
      const visualSignature = signatureFor("prop", propType, nextContext);
      if (isCozyContext(context)) {
        const result = director.bindProp(propType, toContext({ ...nextContext, biome: context.biome ?? "plains", variantHint: context.variantHint ?? "cozy-spring" }));
        const bound = toBoundAsset(propType, result, textureFor, visualSignature);
        if (isCozyEntry(bound.entry)) return withCozyLog("prop", propType, bound);
      }
      const grKind = propKind(propType);
      const grResult = pickGraphicRiverProp(manifest, visualSignature.deterministicSeed, grKind);
      if (grResult?.entry) return simpleBindEntry(propType, grResult.entry, visualSignature);
      const result = director.bindProp(propType, toContext(nextContext));
      return toBoundAsset(propType, result, textureFor, visualSignature);
    },

    bindNpcWithContext: (role: NpcRole, context: BindingOptions) => {
      const seed = combineSeed("npc", role, String(context.seed));
      const nextContext: BindingOptions = { ...context, seed };
      const visualSignature = signatureFor("npc", role, nextContext, { entityId: `npc:${role}:${String(context.seed)}` });
      const grResult = pickGraphicRiverCharacter(manifest, visualSignature.deterministicSeed, role);
      if (grResult?.entry) return simpleBindEntry(role, grResult.entry, visualSignature);
      const query = roleToCharacterQuery(role);
      const picked = pickCharacterVisual(manifest, { tags: [...query.tags], group: query.group, kind: query.kind, seed: visualSignature.deterministicSeed });
      if (picked?.entry) return simpleBindEntry(role, picked.entry, visualSignature);
      const result = director.bindNpc(role, toContext(nextContext));
      return toBoundAsset(role, result, textureFor, visualSignature);
    },
  };
}

function roleToCharacterQuery(role: NpcRole): { readonly group?: string; readonly kind?: string; readonly tags: readonly string[] } {
  if (role === "guard" || role === "guard_captain" || role === "blacksmith") return { group: "Soldier", kind: "soldier", tags: ["soldier"] };
  if (role === "animal") return { group: "Animal", kind: "animal", tags: ["animal"] };
  if (role === "child") return { tags: ["civilian", "child"] };
  return { tags: ["civilian"] };
}

function buildingKind(type: BuildingType): "castle" | "tower" | "house" {
  if (type === "guard_post") return "tower";
  if (type === "blacksmith" || type === "trader_shop" || type === "inn" || type === "healer_hut") return "house";
  return "house";
}

function propKind(type: PropType): "tree" | "bush" | "plant" | "flower" {
  if (type === "tree") return "tree";
  if (type === "bush") return "bush";
  if (type === "flower") return "flower";
  return "plant";
}

function roadKind(type: RoadType): "grass" | "road" | "desert" {
  return type === "dirt_road" || type === "gate_road" || type === "market_loop" ? "road" : "grass";
}

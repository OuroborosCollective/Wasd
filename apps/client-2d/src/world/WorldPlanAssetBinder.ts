/**
 * World Plan Asset Binder
 * 
 * Client-only semantic asset binder. Translates world-plan roles into manifest entries.
 * Contains no placement logic and no ambient randomness - all choices are seeded by plan IDs.
 * 
 * Supports both basic binding (backwards compatible) and context-aware binding with:
 * - Deterministic seeded selection (no Math.random, no Date.now)
 * - Biome/Culture/Faction visual adaptation
 * - Weighted scoring and candidate ranking
 * - Debug info for binding decisions
 */

import type { AssetManifest } from "../assetManifest";
import { pickCharacterVisual } from "../assetManifest";
import { pickGraphicRiverBuilding, pickGraphicRiverCharacter, pickGraphicRiverProp, pickGraphicRiverTile } from "../graphicRiverIsoPicker";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import type { BoundAsset, WorldPlanAssetBinder } from "./WorldPlanRenderTypes";
import type { BindingOptions, AssetBindingContext } from "./AssetBindingContext";
import { createAssetBindingDirector, type BindingResult } from "./AssetBindingDirector";
import { combineSeed } from "./DeterministicAssetRng";

function simpleSeed(seed: string | number): string {
  return String(seed);
}

function toBoundAsset(
  semanticType: string,
  result: BindingResult,
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
): BoundAsset {
  return {
    semanticType: semanticType as BoundAsset["semanticType"],
    entry: result.entry,
    texture: result.entry ? textureFor(result.entry.src) : null,
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

  const simpleBindEntry = (semanticType: string, entry: BoundAsset["entry"]): BoundAsset => ({
    semanticType: semanticType as BoundAsset["semanticType"],
    entry,
    texture: entry ? textureFor(entry.src) : null,
  });

  return {
    bindRoad: (roadType: RoadType, seed?: string) => {
      const roadSeed = seed ?? roadType;
      const grResult = pickGraphicRiverTile(manifest, `road:${roadType}:${roadSeed}`, roadKind(roadType));
      if (grResult?.entry) return simpleBindEntry(roadType, grResult.entry);
      const result = director.bindRoad(roadType, { seed: roadSeed, biome: "plains", variantHint: "cozy-spring" });
      return toBoundAsset(roadType, result, textureFor);
    },

    bindBuilding: (buildingType: BuildingType, seed: string) => {
      const grResult = pickGraphicRiverBuilding(manifest, `building:${buildingType}:${seed}`, buildingKind(buildingType));
      if (grResult?.entry) return simpleBindEntry(buildingType, grResult.entry);
      const result = director.bindBuilding(buildingType, { seed });
      return toBoundAsset(buildingType, result, textureFor);
    },

    bindProp: (propType: PropType, seed: string) => {
      const grResult = pickGraphicRiverProp(manifest, `prop:${propType}:${seed}`, propKind(propType));
      if (grResult?.entry) return simpleBindEntry(propType, grResult.entry);
      const result = director.bindProp(propType, { seed });
      return toBoundAsset(propType, result, textureFor);
    },

    bindNpc: (role: NpcRole, seed: string) => {
      const grResult = pickGraphicRiverCharacter(manifest, `npc:${role}:${seed}`, role);
      if (grResult?.entry) return simpleBindEntry(role, grResult.entry);
      const query = roleToCharacterQuery(role);
      const picked = pickCharacterVisual(manifest, { tags: [...query.tags], group: query.group, kind: query.kind, seed: `npc:${role}:${seed}` });
      if (picked?.entry) return simpleBindEntry(role, picked.entry);
      const result = director.bindNpc(role, { seed });
      return toBoundAsset(role, result, textureFor);
    },

    bindRoadWithContext: (roadType: RoadType, context: BindingOptions) => {
      const seed = combineSeed('road', String(roadType), String(context.seed));
      const grKind = roadKind(roadType);
      const grResult = pickGraphicRiverTile(manifest, `road:${roadType}:${seed}`, grKind);
      if (grResult?.entry) return simpleBindEntry(roadType, grResult.entry);
      const result = director.bindRoad(roadType, toContext({ ...context, seed }));
      return toBoundAsset(roadType, result, textureFor);
    },

    bindBuildingWithContext: (buildingType: BuildingType, context: BindingOptions) => {
      const seed = combineSeed('building', String(buildingType), String(context.seed));
      const grKind = buildingKind(buildingType);
      const grResult = pickGraphicRiverBuilding(manifest, `building:${buildingType}:${seed}`, grKind);
      if (grResult?.entry) return simpleBindEntry(buildingType, grResult.entry);
      const result = director.bindBuilding(buildingType, toContext({ ...context, seed }));
      return toBoundAsset(buildingType, result, textureFor);
    },

    bindPropWithContext: (propType: PropType, context: BindingOptions) => {
      const seed = combineSeed('prop', String(propType), String(context.seed));
      const grKind = propKind(propType);
      const grResult = pickGraphicRiverProp(manifest, `prop:${propType}:${seed}`, grKind);
      if (grResult?.entry) return simpleBindEntry(propType, grResult.entry);
      const result = director.bindProp(propType, toContext({ ...context, seed }));
      return toBoundAsset(propType, result, textureFor);
    },

    bindNpcWithContext: (role: NpcRole, context: BindingOptions) => {
      const seed = combineSeed('npc', role, String(context.seed));
      const grResult = pickGraphicRiverCharacter(manifest, `npc:${role}:${seed}`, role);
      if (grResult?.entry) return simpleBindEntry(role, grResult.entry);
      const query = roleToCharacterQuery(role);
      const picked = pickCharacterVisual(manifest, { tags: [...query.tags], group: query.group, kind: query.kind, seed });
      if (picked?.entry) return simpleBindEntry(role, picked.entry);
      const result = director.bindNpc(role, toContext({ ...context, seed }));
      return toBoundAsset(role, result, textureFor);
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

import type { AssetManifest } from "../assetManifest";
import { fallbackEntry, pickCharacterVisual } from "../assetManifest";
import { pickGraphicRiverBuilding, pickGraphicRiverCharacter, pickGraphicRiverProp, pickGraphicRiverTile } from "../graphicRiverIsoPicker";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared";
import type { BoundAsset, WorldPlanAssetBinder } from "./WorldPlanRenderTypes";

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

/**
 * Client-only semantic asset binder. It translates world-plan roles into manifest entries.
 * It contains no placement logic and no ambient randomness; all choices are seeded by plan IDs.
 */
export function createWorldPlanAssetBinder(manifest: AssetManifest | null, textureFor: (src: string | null | undefined) => BoundAsset["texture"]): WorldPlanAssetBinder {
  const bindEntry = (semanticType: BoundAsset["semanticType"], entry: BoundAsset["entry"]): BoundAsset => ({ semanticType, entry, texture: textureFor(entry?.src) });

  return {
    bindRoad: (roadType) => bindEntry(roadType, pickGraphicRiverTile(manifest, `road:${roadType}`, roadKind(roadType))?.entry ?? fallbackEntry(manifest, "tilesets", "tile")),
    bindBuilding: (buildingType, seed) => bindEntry(buildingType, pickGraphicRiverBuilding(manifest, `building:${buildingType}:${seed}`, buildingKind(buildingType))?.entry ?? fallbackEntry(manifest, "buildings", "house")),
    bindProp: (propType, seed) => bindEntry(propType, pickGraphicRiverProp(manifest, `prop:${propType}:${seed}`, propKind(propType))?.entry ?? fallbackEntry(manifest, "props", propType === "tree" ? "tree" : "fx")),
    bindNpc: (role, seed) => {
      const query = roleToCharacterQuery(role);
      const picked = pickGraphicRiverCharacter(manifest, `npc:${role}:${seed}`, role)
        ?? pickCharacterVisual(manifest, { tags: [...query.tags], group: query.group, kind: query.kind, seed: `npc:${role}:${seed}` });
      return bindEntry(role, picked?.entry ?? fallbackEntry(manifest, "characters", "npc"));
    },
  };
}

import type { Container, Texture } from "pixi.js";
import type { AssetEntry } from "../assetManifest";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared";

export type RenderLayerName = "terrain" | "roads" | "buildings" | "props" | "actors";

export interface BoundAsset {
  readonly semanticType: BuildingType | PropType | RoadType | NpcRole | "terrain";
  readonly entry: AssetEntry | null;
  readonly texture: Texture | null;
}

export interface WorldPlanRenderContext {
  readonly width: number;
  readonly height: number;
  readonly terrain: Container;
  readonly props: Container;
  readonly actors: Container;
  readonly textureFor: (entry: AssetEntry | null | undefined) => Texture | null;
  readonly addNpcActor: (input: { readonly id: string; readonly tileX: number; readonly tileZ: number; readonly name: string; readonly role: NpcRole; readonly characterVisualId: string | null }) => void;
}

export interface WorldPlanAssetBinder {
  readonly bindRoad: (roadType: RoadType) => BoundAsset;
  readonly bindBuilding: (buildingType: BuildingType, seed: string) => BoundAsset;
  readonly bindProp: (propType: PropType, seed: string) => BoundAsset;
  readonly bindNpc: (role: NpcRole, seed: string) => BoundAsset;
}

import type { Container, Texture } from "pixi.js";
import type { AssetEntry } from "../assetManifest";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import type { BindingOptions } from "./AssetBindingContext";
import type { VisualSignature } from "./VisualSignature";

export type RenderLayerName = "terrain" | "roads" | "buildings" | "props" | "actors";

export interface AssetBindingDebug {
  readonly seed: string;
  readonly semanticType: string;
  readonly candidates: number;
  readonly topScores?: readonly { id: string; score: number; reasons: readonly string[] }[];
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly finalScore: number;
}

export interface BoundAsset {
  readonly semanticType: BuildingType | PropType | RoadType | NpcRole | "terrain";
  readonly entry: AssetEntry | null;
  readonly texture: Texture | null;
  readonly visualSignature?: VisualSignature;
  readonly debug?: AssetBindingDebug;
}

export interface WorldPlanRenderContext {
  readonly width: number;
  readonly height: number;
  readonly terrain: Container;
  readonly props: Container;
  readonly actors: Container;
  readonly textureFor: (entry: AssetEntry | null | undefined) => Texture | null;
  readonly addNpcActor: (input: {
    readonly id: string;
    readonly tileX: number;
    readonly tileZ: number;
    readonly name: string;
    readonly role: NpcRole;
    readonly characterVisualId: string | null;
    readonly visualSignature?: VisualSignature | null;
  }) => void;
}

export interface WorldPlanAssetBinder {
  readonly bindRoad: (roadType: RoadType, seed?: string) => BoundAsset;
  readonly bindBuilding: (buildingType: BuildingType, seed: string) => BoundAsset;
  readonly bindProp: (propType: PropType, seed: string) => BoundAsset;
  readonly bindNpc: (role: NpcRole, seed: string) => BoundAsset;
  readonly bindRoadWithContext: (roadType: RoadType, context: BindingOptions) => BoundAsset;
  readonly bindBuildingWithContext: (buildingType: BuildingType, context: BindingOptions) => BoundAsset;
  readonly bindPropWithContext: (propType: PropType, context: BindingOptions) => BoundAsset;
  readonly bindNpcWithContext: (role: NpcRole, context: BindingOptions) => BoundAsset;
}

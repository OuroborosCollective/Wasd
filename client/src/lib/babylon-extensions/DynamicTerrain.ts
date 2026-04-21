/**
 * ESM wrapper for BabylonJS DynamicTerrain extension.
 * The legacy IIFE script populates window.BABYLON.DynamicTerrain.
 * This module ensures it's loaded and re-exports the class.
 *
 * Source: https://github.com/BabylonJS/Extensions/tree/master/DynamicTerrain
 */
import { Scene, Mesh, Camera, Vector3, Color3, SolidParticleSystem } from "@babylonjs/core";

// Side-effect import: runs the IIFE which attaches to (window as any).BABYLON
import "./babylon.dynamicTerrain.min.js";

const BABYLON_NS = (globalThis as any).BABYLON;

if (!BABYLON_NS?.DynamicTerrain) {
  throw new Error(
    "[DynamicTerrain] Failed to load. Ensure @babylonjs/core is imported before this module " +
    "so the BABYLON global namespace is populated."
  );
}

export const DynamicTerrain: DynamicTerrainConstructor = BABYLON_NS.DynamicTerrain;

export interface DynamicTerrainOptions {
  terrainSub?: number;
  mapData?: number[] | Float32Array;
  mapSubX?: number;
  mapSubZ?: number;
  mapUVs?: number[] | Float32Array;
  mapColors?: number[] | Float32Array;
  mapNormals?: number[] | Float32Array;
  invertSide?: boolean;
  camera?: Camera;
  SPmapData?: number[][] | Float32Array[];
  sps?: SolidParticleSystem;
  SPcolorData?: number[][] | Float32Array[];
  SPuvData?: number[][] | Float32Array[];
  instanceMapData?: number[][] | Float32Array[];
  sourceMeshes?: Mesh[];
  instanceColorData?: number[][] | Float32Array[];
  precomputeInstances?: boolean;
}

export interface DynamicTerrainVertex {
  position: Vector3;
  uvs: { x: number; y: number };
  color: { r: number; g: number; b: number; a: number };
  lodX: number;
  lodZ: number;
  worldPosition: Vector3;
  mapIndex: number;
}

export interface IDynamicTerrain {
  name: string;
  mesh: Mesh;
  camera: Camera;
  refreshEveryFrame: boolean;
  subToleranceX: number;
  subToleranceZ: number;
  initialLOD: number;
  LODValue: number;
  cameraLODCorrection: number;
  LODPositiveX: boolean;
  LODNegativeX: boolean;
  LODPositiveZ: boolean;
  LODNegativeZ: boolean;
  LODLimits: number[];
  averageSubSizeX: number;
  averageSubSizeZ: number;
  terrainSizeX: number;
  terrainHalfSizeX: number;
  terrainSizeZ: number;
  terrainHalfSizeZ: number;
  centerLocal: Vector3;
  centerWorld: Vector3;
  mapData: Float32Array | number[];
  mapSubX: number;
  mapSubZ: number;
  mapColors: Float32Array | number[];
  mapUVs: Float32Array | number[];
  mapNormals: Float32Array | number[];
  computeNormals: boolean;
  useCustomVertexFunction: boolean;
  isAlwaysVisible: boolean;
  precomputeNormalsFromMap: boolean;
  shiftFromCamera: { x: number; z: number };

  update(force: boolean): IDynamicTerrain;
  updateTerrainSize(): IDynamicTerrain;
  computeNormalsFromMap(): IDynamicTerrain;
  createUVMap(): IDynamicTerrain;
  contains(x: number, z: number): boolean;
  getHeightFromMap(x: number, z: number, options?: { normal: Vector3 }): number;

  updateVertex(vertex: DynamicTerrainVertex, i: number, j: number): void;
  updateCameraLOD(terrainCamera: Camera): number;
  beforeUpdate(refreshEveryFrame: boolean): void;
  afterUpdate(refreshEveryFrame: boolean): void;
}

export interface DynamicTerrainConstructor {
  new (name: string, options: DynamicTerrainOptions, scene: Scene): IDynamicTerrain;

  CreateMapFromHeightMap(
    heightmapURL: string,
    options: {
      width: number;
      height: number;
      subX: number;
      subZ: number;
      minHeight: number;
      maxHeight: number;
      offsetX: number;
      offsetZ: number;
      onReady?: (map: number[] | Float32Array, subX: number, subZ: number) => void;
      colorFilter?: Color3;
    },
    scene: Scene
  ): Float32Array;

  CreateMapFromHeightMapToRef(
    heightmapURL: string,
    options: {
      width: number;
      height: number;
      subX: number;
      subZ: number;
      minHeight: number;
      maxHeight: number;
      offsetX: number;
      offsetZ: number;
      onReady?: (map: number[] | Float32Array, subX: number, subZ: number) => void;
      colorFilter?: Color3;
    },
    data: number[] | Float32Array,
    scene: Scene
  ): void;

  GetHeightFromMap(
    x: number,
    z: number,
    mapData: number[] | Float32Array,
    mapSubX: number,
    mapSubZ: number,
    options?: { normal: Vector3 },
    inverted?: boolean
  ): number;

  ComputeNormalsFromMapToRef(
    mapData: number[] | Float32Array,
    mapSubX: number,
    mapSubZ: number,
    normals: number[] | Float32Array,
    inverted: boolean
  ): void;

  CreateUVMap(subX: number, subZ: number): Float32Array;
  CreateUVMapToRef(subX: number, subZ: number, mapUVs: number[] | Float32Array): void;
}

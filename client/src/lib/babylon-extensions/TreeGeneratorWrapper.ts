/**
 * ESM wrapper for BabylonJS SPSTreeGenerator extension.
 * Procedural tree generation using Solid Particle System.
 *
 * Source: https://github.com/BabylonJS/Extensions/tree/master/TreeGenerators/SPSTreeGenerator
 */
import { Scene, Mesh, Material, StandardMaterial, Color3 } from "@babylonjs/core";

// Side-effect import: the IIFE sets window.createTree, window.createTreeBase (now patched to use window.*)
import "./TreeGenerator.js";

// createTree is now attached to window by the patched IIFE
function getCreateTree(): CreateTreeFn {
  const fn: CreateTreeFn | undefined = (globalThis as any).createTree;
  if (typeof fn !== "function") {
    throw new Error(
      "[TreeGenerator] Failed to load. Ensure @babylonjs/core is imported before this module."
    );
  }
  return fn;
}

export interface CreateTreeOptions {
  /** Height of the trunk. */
  trunkHeight?: number;
  /** Fraction of starting radius for end radius (0-1). */
  trunkTaper?: number;
  /** Number of points on branch paths (ribbon slices). */
  trunkSlices?: number;
  /** Material for all branches/trunk. */
  trunkMaterial?: Material;
  /** Number of times tree splits into forked branches (1 or 2). */
  boughs?: 1 | 2;
  /** Number of branches a branch splits into. Keep <= 4 for perf. */
  forks?: number;
  /** Angle a forked branch makes with parent (radians). */
  forkAngle?: number;
  /** Ratio of child branch length to parent (0-1). */
  forkRatio?: number;
  /** Number of mini-trees randomly added to branches. */
  branches?: number;
  /** Angle the mini-tree makes with parent branch (radians). */
  branchAngle?: number;
  /** Number of bows (bends) in a branch. */
  bowFreq?: number;
  /** Height of a bow from branch direction. */
  bowHeight?: number;
  /** Number of leaves on one side of a branch. */
  leavesOnBranch?: number;
  /** Leaf width-to-height ratio (0 = long, 1 = circular). */
  leafWHRatio?: number;
  /** Material for leaves. */
  leafMaterial?: Material;
}

type CreateTreeFn = (
  trunkHeight: number,
  trunkTaper: number,
  trunkSlices: number,
  trunkMaterial: Material,
  boughs: number,
  forks: number,
  forkAngle: number,
  forkRatio: number,
  branches: number,
  branchAngle: number,
  bowFreq: number,
  bowHeight: number,
  leavesOnBranch: number,
  leafWHRatio: number,
  leafMaterial: Material,
  scene: Scene
) => Mesh;

/**
 * Create a procedural tree with trunk, branches, and leaves.
 *
 * Returns a root TransformNode with:
 * - trunk + branches (ribbon mesh)
 * - mini-tree crown (SPS)
 * - leaves crown (SPS with billboard)
 *
 * @example
 * ```ts
 * import { createTree, defaultTrunkMaterial, defaultLeafMaterial } from "./lib/babylon-extensions/TreeGenerator";
 *
 * const trunkMat = defaultTrunkMaterial(scene);
 * const leafMat = defaultLeafMaterial(scene);
 *
 * const tree = createTree(scene, {
 *   trunkHeight: 5,
 *   trunkMaterial: trunkMat,
 *   leafMaterial: leafMat,
 *   boughs: 1,
 *   forks: 3,
 * });
 * tree.position = new Vector3(10, 0, 10);
 * ```
 */
export function createTree(scene: Scene, options: CreateTreeOptions = {}): Mesh {
  const trunkHeight = options.trunkHeight ?? 4;
  const trunkTaper = options.trunkTaper ?? 0.6;
  const trunkSlices = options.trunkSlices ?? 10;
  const trunkMaterial = options.trunkMaterial ?? defaultTrunkMaterial(scene);
  const boughs = options.boughs ?? 1;
  const forks = options.forks ?? 3;
  const forkAngle = options.forkAngle ?? (Math.PI / 6);
  const forkRatio = options.forkRatio ?? 0.6;
  const branches = options.branches ?? 15;
  const branchAngle = options.branchAngle ?? (Math.PI / 4);
  const bowFreq = options.bowFreq ?? 2;
  const bowHeight = options.bowHeight ?? 0.5;
  const leavesOnBranch = options.leavesOnBranch ?? 6;
  const leafWHRatio = options.leafWHRatio ?? 0.5;
  const leafMaterial = options.leafMaterial ?? defaultLeafMaterial(scene);

  return getCreateTree()(
    trunkHeight,
    trunkTaper,
    trunkSlices,
    trunkMaterial,
    boughs,
    forks,
    forkAngle,
    forkRatio,
    branches,
    branchAngle,
    bowFreq,
    bowHeight,
    leavesOnBranch,
    leafWHRatio,
    leafMaterial,
    scene
  );
}

/** Default brown bark material for trunk/branches. */
export function defaultTrunkMaterial(scene: Scene): StandardMaterial {
  const mat = new StandardMaterial("tree-trunk-mat", scene);
  mat.diffuseColor = new Color3(0.35, 0.22, 0.1);
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  return mat;
}

/** Default green leaf material. */
export function defaultLeafMaterial(scene: Scene): StandardMaterial {
  const mat = new StandardMaterial("tree-leaf-mat", scene);
  mat.diffuseColor = new Color3(0.15, 0.5, 0.1);
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  mat.backFaceCulling = false;
  return mat;
}

/**
 * Create a small bush (low trunk, many branches, lots of leaves).
 */
export function createBush(scene: Scene, options: CreateTreeOptions = {}): Mesh {
  return createTree(scene, {
    ...options,
    trunkHeight: options.trunkHeight ?? 1.5,
    trunkTaper: options.trunkTaper ?? 0.4,
    trunkSlices: options.trunkSlices ?? 6,
    boughs: 1,
    forks: options.forks ?? 4,
    forkAngle: options.forkAngle ?? (Math.PI / 3),
    forkRatio: options.forkRatio ?? 0.7,
    branches: options.branches ?? 20,
    bowFreq: options.bowFreq ?? 1,
    bowHeight: options.bowHeight ?? 0.2,
    leavesOnBranch: options.leavesOnBranch ?? 8,
    leafWHRatio: options.leafWHRatio ?? 0.7,
  });
}

/**
 * Create a tall pine tree (narrow, tall, fewer branches).
 */
export function createPine(scene: Scene, options: CreateTreeOptions = {}): Mesh {
  return createTree(scene, {
    ...options,
    trunkHeight: options.trunkHeight ?? 8,
    trunkTaper: options.trunkTaper ?? 0.3,
    trunkSlices: options.trunkSlices ?? 12,
    boughs: 2,
    forks: options.forks ?? 3,
    forkAngle: options.forkAngle ?? (Math.PI / 5),
    forkRatio: options.forkRatio ?? 0.5,
    branches: options.branches ?? 8,
    bowFreq: options.bowFreq ?? 1,
    bowHeight: options.bowHeight ?? 0.3,
    leavesOnBranch: options.leavesOnBranch ?? 4,
    leafWHRatio: options.leafWHRatio ?? 0.3,
  });
}

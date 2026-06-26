/**
 * NavigationService — Recast/Detour navigation mesh and crowd management.
 *
 * Docs: https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/v2Intro
 */

import { Scene, Mesh, Vector3, TransformNode } from "@babylonjs/core";

export interface NavMeshConfig {
  cellSize: number;
  cellHeight: number;
  agentHeight: number;
  agentRadius: number;
  agentMaxClimb: number;
  agentMaxSlope: number;
  regionMinSize: number;
  regionMergeSize: number;
  edgeMaxLen: number;
  edgeMaxError: number;
  vertsPerPoly: number;
  detailSampleDist: number;
  detailSampleMaxError: number;
}

export interface NavAgent {
  id: string;
  position: Vector3;
  target: Vector3 | null;
  speed: number;
  radius: number;
  active: boolean;
}

const DEFAULT_NAV_CONFIG: NavMeshConfig = {
  cellSize: 0.3,
  cellHeight: 0.2,
  agentHeight: 1.8,
  agentRadius: 0.5,
  agentMaxClimb: 0.5,
  agentMaxSlope: 0.52, // ~30 deg
  regionMinSize: 8,
  regionMergeSize: 20,
  edgeMaxLen: 12,
  edgeMaxError: 1.3,
  vertsPerPoly: 6,
  detailSampleDist: 6,
  detailSampleMaxError: 1,
};

export class NavigationService {
  private scene: Scene | null = null;
  private config: NavMeshConfig;
  private dirtyRegions: Map<string, { minX: number; minY: number; maxX: number; maxY: number }> = new Map();
  private agents: Map<string, NavAgent> = new Map();
  private initialized = false;
  private navMesh: any = null; // Recast navmesh instance
  private navMeshSource: "none" | "placeholder" | "recast" = "none";
  private lastRebuildTime: number | null = null;

  constructor(config?: Partial<NavMeshConfig>) {
    this.config = { ...DEFAULT_NAV_CONFIG, ...config };
  }

  async init(scene: Scene): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;

    try {
      // Recast-detour is loaded as WASM — init lazily
      // For now, mark as initialized with placeholder source
      this.initialized = true;
      this.navMeshSource = "placeholder";
      console.log("[NavigationService] Navigation service initialized (source: placeholder, no recast mesh).");
    } catch (err) {
      console.error("[NavigationService] Failed to initialize:", err);
    }
  }

  /** Mark a region as dirty for navmesh rebuild. */
  markDirty(id: string, minX: number, minY: number, maxX: number, maxY: number): void {
    this.dirtyRegions.set(id, { minX, minY, maxX, maxY });
  }

  /** Get all dirty regions. */
  getDirtyRegions(): Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }> {
    return Array.from(this.dirtyRegions.entries()).map(([id, bounds]) => ({ id, bounds }));
  }

  /** Clear a dirty region after rebuild. */
  clearDirty(id: string): void {
    this.dirtyRegions.delete(id);
  }

  /** Check if navmesh needs rebuild. */
  needsRebuild(): boolean {
    return this.dirtyRegions.size > 0;
  }

  /** Rebuild dirty regions of the navmesh. */
  async rebuildDirtyRegions(): Promise<void> {
    if (!this.needsRebuild()) return;

    // Collect all dirty bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const region of this.dirtyRegions.values()) {
      minX = Math.min(minX, region.minX);
      minY = Math.min(minY, region.minY);
      maxX = Math.max(maxX, region.maxX);
      maxY = Math.max(maxY, region.maxY);
    }

    console.log(
      `[NavigationService] Rebuilding navmesh region: (${minX},${minY}) to (${maxX},${maxY}), ` +
      `${this.dirtyRegions.size} dirty areas.`
    );

    // TODO: Call recast-detour rebuild with scene meshes in bounds
    // For now, clear dirty regions and record rebuild time
    this.dirtyRegions.clear();
    this.lastRebuildTime = performance.now();
  }

  /** Register a crowd agent (NPC). */
  registerAgent(id: string, position: Vector3, radius: number = 0.5, speed: number = 3.5): NavAgent {
    const agent: NavAgent = {
      id,
      position: position.clone(),
      target: null,
      speed,
      radius,
      active: true,
    };
    this.agents.set(id, agent);
    return agent;
  }

  /** Set agent target for pathfinding. */
  setAgentTarget(agentId: string, target: Vector3): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.target = target.clone();
    return true;
  }

  /** Remove an agent. */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /** Get agent by ID. */
  getAgent(agentId: string): NavAgent | undefined {
    return this.agents.get(agentId);
  }

  /** Get all active agents. */
  getActiveAgents(): NavAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.active);
  }

  /** Check if a position is walkable. Returns false when navmesh source is unavailable. */
  isWalkable(x: number, y: number): boolean {
    // No real navmesh source available — report unknown as false (fail-closed)
    if (this.navMeshSource === "none") {
      return false;
    }
    // Placeholder source — cannot make real walkability determination
    if (this.navMeshSource === "placeholder") {
      return false;
    }
    // TODO: Query actual Recast navmesh
    // const result = this.navMesh.getPolyAt(x, y);
    // return result !== null && result.walkable === true;
    return false;
  }

  /** Get stats including navmesh source and rebuild status. */
  getStats(): { agents: number; dirtyRegions: number; initialized: boolean; navMeshSource: string; hasRebuiltMesh: boolean } {
    return {
      agents: this.agents.size,
      dirtyRegions: this.dirtyRegions.size,
      initialized: this.initialized,
      navMeshSource: this.navMeshSource,
      hasRebuiltMesh: this.lastRebuildTime !== null,
    };
  }

  dispose(): void {
    this.agents.clear();
    this.dirtyRegions.clear();
    this.navMesh = null;
    this.navMeshSource = "none";
    this.lastRebuildTime = null;
    this.initialized = false;
  }
}

export const navigationService = new NavigationService();

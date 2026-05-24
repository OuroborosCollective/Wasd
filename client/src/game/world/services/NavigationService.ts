/**
 * NavigationService — Recast/Detour navigation mesh and crowd management.
 *
 * Docs: https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/v2Intro
 */

import { Scene, Vector3, AbstractMesh } from "@babylonjs/core";

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
  private dirtyRegions: Map<string, { minX: number; minZ: number; maxX: number; maxZ: number }> = new Map();
  private agents: Map<string, NavAgent> = new Map();
  private initialized = false;
  private navMeshPlugin: any = null; // RecastJSPlugin instance
  private rebuilding = false;

  constructor(config?: Partial<NavMeshConfig>) {
    this.config = { ...DEFAULT_NAV_CONFIG, ...config };
  }

  async init(scene: Scene): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;

    try {
      // Recast-detour is loaded as WASM — init lazily
      // TODO: Instantiate RecastJSPlugin once the WASM library is available in the project
      // const Recast = await import("recast-detour");
      // this.navMeshPlugin = new RecastJSPlugin(Recast);

      this.initialized = true;
      console.log("[NavigationService] Navigation service initialized.");
    } catch (err) {
      console.error("[NavigationService] Failed to initialize:", err);
    }
  }

  /** Mark a region as dirty for navmesh rebuild. */
  markDirty(id: string, minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.dirtyRegions.set(id, { minX, minZ, maxX, maxZ });
  }

  /** Get all dirty regions. */
  getDirtyRegions(): Array<{ id: string; bounds: { minX: number; minZ: number; maxX: number; maxZ: number } }> {
    return Array.from(this.dirtyRegions.entries()).map(([id, bounds]) => ({ id, bounds }));
  }

  /** Clear a dirty region after rebuild. */
  clearDirty(id: string): void {
    this.dirtyRegions.delete(id);
  }

  /** Check if navmesh needs rebuild. */
  needsRebuild(): boolean {
    return this.dirtyRegions.size > 0 && !this.rebuilding;
  }

  /** Rebuild dirty regions of the navmesh. */
  async rebuildDirtyRegions(): Promise<void> {
    if (!this.needsRebuild() || this.rebuilding) return;
    this.rebuilding = true;

    try {
      // 1. Collect all dirty bounds into an aggregate area
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const region of this.dirtyRegions.values()) {
        minX = Math.min(minX, region.minX);
        minZ = Math.min(minZ, region.minZ);
        maxX = Math.max(maxX, region.maxX);
        maxZ = Math.max(maxZ, region.maxZ);
      }

      console.log(
        `[NavigationService] Rebuilding navmesh region: (${minX.toFixed(1)}, ${minZ.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxZ.toFixed(1)}), ` +
        `${this.dirtyRegions.size} dirty areas.`
      );

      // 2. Gather meshes that intersect with these bounds
      const meshesToBuild = this.getMeshesInBounds(minX, minZ, maxX, maxZ);

      if (meshesToBuild.length === 0) {
        console.warn("[NavigationService] No meshes found in rebuild bounds, skipping.");
      } else {
        // 3. Rebuild navmesh using collected meshes
        // TODO: Call this.navMeshPlugin.createNavMesh(meshesToBuild, this.getNavMeshParameters())
        // For now, we clear the dirty regions to acknowledge the request
        console.log(`[NavigationService] Placeholder: Rebuilding with ${meshesToBuild.length} meshes.`);
      }

      this.dirtyRegions.clear();
    } finally {
      this.rebuilding = false;
    }
  }

  /** Retrieve and filter scene meshes within specified world bounds. */
  private getMeshesInBounds(minX: number, minZ: number, maxX: number, maxZ: number): AbstractMesh[] {
    if (!this.scene) return [];

    return this.scene.meshes.filter((mesh) => {
      // Skip non-pickable or hidden meshes
      if (!mesh.isEnabled() || !mesh.isVisible) return false;

      // Only include static obstacles or terrain
      // We look for metadata or specific naming conventions (e.g., from WorldGeneratorService)
      const isStatic = mesh.isStaticFrozen || mesh.name.includes("terrain") || mesh.name.includes("chunk");
      if (!isStatic) return false;

      const bounds = mesh.getBoundingInfo().boundingBox;
      const meshMin = bounds.minimumWorld;
      const meshMax = bounds.maximumWorld;

      // Check for AABB intersection on XZ plane
      return !(
        meshMax.x < minX ||
        meshMin.x > maxX ||
        meshMax.z < minZ ||
        meshMin.z > maxZ
      );
    });
  }

  /** Map internal NavMeshConfig to Recast-compatible parameters. */
  private getNavMeshParameters(): any {
    return {
      cs: this.config.cellSize,
      ch: this.config.cellHeight,
      walkableSlopeAngle: this.config.agentMaxSlope * (180 / Math.PI),
      walkableHeight: this.config.agentHeight,
      walkableClimb: this.config.agentMaxClimb,
      walkableRadius: this.config.agentRadius,
      maxEdgeLen: this.config.edgeMaxLen,
      maxSimplificationError: this.config.edgeMaxError,
      minRegionArea: this.config.regionMinSize * this.config.regionMinSize,
      mergeRegionArea: this.config.regionMergeSize * this.config.regionMergeSize,
      maxVertsPerPoly: this.config.vertsPerPoly,
      detailSampleDist: this.config.detailSampleDist,
      detailSampleMaxError: this.config.detailSampleMaxError,
    };
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

    // TODO: If navMeshPlugin is initialized, call agent.goto(target)
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

  /** Check if a position is walkable. */
  isWalkable(x: number, z: number): boolean {
    if (!this.navMeshPlugin) return true;
    // TODO: Query navmesh plugin
    // const result = this.navMeshPlugin.getClosestPoint(new Vector3(x, 0, z));
    return true;
  }

  /** Get stats. */
  getStats(): { agents: number; dirtyRegions: number; initialized: boolean; rebuilding: boolean } {
    return {
      agents: this.agents.size,
      dirtyRegions: this.dirtyRegions.size,
      initialized: this.initialized,
      rebuilding: this.rebuilding,
    };
  }

  dispose(): void {
    this.agents.clear();
    this.dirtyRegions.clear();
    if (this.navMeshPlugin) {
      this.navMeshPlugin.dispose();
      this.navMeshPlugin = null;
    }
    this.initialized = false;
  }
}

export const navigationService = new NavigationService();

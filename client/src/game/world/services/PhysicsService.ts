/**
 * PhysicsService — Havok physics integration for the client.
 * Manages static colliders for world geometry and dynamic bodies for interactive objects.
 *
 * Docs: https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin
 */

import {
  Scene,
  HavokPlugin,
  PhysicsAggregate,
  PhysicsShapeType,
  Vector3,
  Mesh,
  TransformNode,
} from "@babylonjs/core";

export type PhysicsBodyMode = "static" | "dynamic" | "animated" | "none";

export interface PhysicsBodyConfig {
  shape: PhysicsShapeType;
  mass: number;
  friction: number;
  restitution: number;
  isTrigger: boolean;
}

const STATIC_CONFIG: PhysicsBodyConfig = {
  shape: PhysicsShapeType.BOX,
  mass: 0,
  friction: 0.6,
  restitution: 0.1,
  isTrigger: false,
};

const DYNAMIC_CONFIG: PhysicsBodyConfig = {
  shape: PhysicsShapeType.BOX,
  mass: 1,
  friction: 0.5,
  restitution: 0.3,
  isTrigger: false,
};

const MAX_BODIES_PER_CHUNK = 48;

export class PhysicsService {
  private scene: Scene | null = null;
  private plugin: HavokPlugin | null = null;
  private aggregates = new Map<string, PhysicsAggregate>();
  private initialized = false;
  private initFailed = false;

  async init(scene: Scene): Promise<void> {
    if (this.initialized || this.initFailed) return;

    try {
      const havokInstance = await (await import("@babylonjs/havok")).default();
      this.plugin = new HavokPlugin(true, havokInstance);
      scene.enablePhysics(new Vector3(0, -9.81, 0), this.plugin);
      this.scene = scene;
      this.initialized = true;
      console.log("[PhysicsService] Havok physics initialized.");
    } catch (err) {
      this.initFailed = true;
      console.warn(
        "[PhysicsService] Havok failed to load — game runs without physics. " +
        "Check .wasm MIME type and COOP/COEP headers. Error:",
        err
      );
    }
  }

  /** Returns true if Havok init failed (game still works without physics). */
  hasInitFailed(): boolean {
    return this.initFailed;
  }

  /** Validates that mesh transforms are finite and bounded to prevent Havok crashes. */
  private isValidTransform(mesh: Mesh | TransformNode): boolean {
    const p = mesh.position;
    const r = mesh.rotation;
    const s = mesh.scaling;

    // Check for finite numbers
    const isFinite = (
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
      Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.z) &&
      Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z)
    );
    if (!isFinite) return false;

    // Guard against extreme values that can cause engine instability
    // World is approx 400x400, so 10000 is a safe upper bound
    const MAX_COORD = 10000;
    const MAX_SCALE = 1000;

    if (Math.abs(p.x) > MAX_COORD || Math.abs(p.y) > MAX_COORD || Math.abs(p.z) > MAX_COORD) return false;
    if (Math.abs(s.x) > MAX_SCALE || Math.abs(s.y) > MAX_SCALE || Math.abs(s.z) > MAX_SCALE) return false;

    // Guard against zero scale (Havok can crash or throw on degenerate shapes)
    if (Math.abs(s.x) < 1e-5 || Math.abs(s.y) < 1e-5 || Math.abs(s.z) < 1e-5) return false;

    return true;
  }

  /** Add a static collider for a world object (house, wall, etc.). */
  addStaticCollider(
    id: string,
    mesh: Mesh,
    config?: Partial<PhysicsBodyConfig>
  ): void {
    if (!this.scene || !this.initialized) return;
    if (this.aggregates.has(id)) return;
    if (this.aggregates.size >= MAX_BODIES_PER_CHUNK) return;
    if (!this.isValidTransform(mesh)) {
      console.warn(`[PhysicsService] Invalid transform for static collider "${id}", skipping.`);
      return;
    }

    const cfg = { ...STATIC_CONFIG, ...config };
    const aggregate = new PhysicsAggregate(mesh, cfg.shape, {
      mass: cfg.mass,
      friction: cfg.friction,
      restitution: cfg.restitution,
    }, this.scene);

    this.aggregates.set(id, aggregate);
  }

  /** Add a dynamic physics body (for interactive objects). */
  addDynamicBody(
    id: string,
    mesh: Mesh,
    config?: Partial<PhysicsBodyConfig>
  ): void {
    if (!this.scene || !this.initialized) return;
    if (this.aggregates.has(id)) return;
    if (this.aggregates.size >= MAX_BODIES_PER_CHUNK) return;
    if (!this.isValidTransform(mesh)) {
      console.warn(`[PhysicsService] Invalid transform for dynamic body "${id}", skipping.`);
      return;
    }

    const cfg = { ...DYNAMIC_CONFIG, ...config };
    const aggregate = new PhysicsAggregate(mesh, cfg.shape, {
      mass: cfg.mass,
      friction: cfg.friction,
      restitution: cfg.restitution,
    }, this.scene);

    this.aggregates.set(id, aggregate);
  }

  /** Add a ground collider (for terrain). */
  addGroundCollider(
    id: string,
    mesh: Mesh,
    _depth: number = 1
  ): void {
    if (!this.scene || !this.initialized) return;
    if (this.aggregates.has(id)) return;
    if (this.aggregates.size >= MAX_BODIES_PER_CHUNK) return;
    if (!this.isValidTransform(mesh)) {
      console.warn(`[PhysicsService] Invalid transform for ground collider "${id}", skipping.`);
      return;
    }

    // Use MESH for accurate terrain collisions
    const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
      mass: 0,
      friction: 0.8,
      restitution: 0.0,
    }, this.scene);

    this.aggregates.set(id, aggregate);
  }

  /** Remove a physics body. */
  removeBody(id: string): void {
    const aggregate = this.aggregates.get(id);
    if (aggregate) {
      aggregate.dispose();
      this.aggregates.delete(id);
    }
  }

  /**
   * Deactivate physics bodies far from observer position.
   * Sleeps (disables simulation for) bodies beyond the given distance.
   * Wakes bodies back up when they come back into range.
   */
  deactivateFarBodies(observerPos: Vector3, maxDistance: number = 120): void {
    if (!this.initialized || !this.plugin) return;
    const maxDistSq = maxDistance * maxDistance;

    for (const [id, aggregate] of this.aggregates) {
      try {
        const bodyPos = aggregate.body.transformNode?.position;
        if (!bodyPos) continue;
        const dx = bodyPos.x - observerPos.x;
        const dz = bodyPos.z - observerPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq > maxDistSq) {
          aggregate.body.disablePreStep = true;
        } else {
          aggregate.body.disablePreStep = false;
        }
      } catch {
        // Body may have been disposed externally
      }
    }
  }

  /**
   * Remove all physics bodies whose mesh position is beyond the given distance
   * from the observer. Use this when chunks unload to free Havok memory.
   */
  removeFarBodies(observerPos: Vector3, maxDistance: number = 100): void {
    if (!this.initialized) return;
    const maxDistSq = maxDistance * maxDistance;
    const toRemove: string[] = [];

    for (const [id, aggregate] of this.aggregates) {
      try {
        const bodyPos = aggregate.body.transformNode?.position;
        if (!bodyPos) { toRemove.push(id); continue; }
        const dx = bodyPos.x - observerPos.x;
        const dz = bodyPos.z - observerPos.z;
        if (dx * dx + dz * dz > maxDistSq) {
          toRemove.push(id);
        }
      } catch {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removeBody(id);
    }
  }

  /** Check if physics is active. */
  isActive(): boolean {
    return this.initialized;
  }

  /** Get body count. */
  getBodyCount(): number {
    return this.aggregates.size;
  }

  /** Get stats. */
  getStats(): { total: number; static: number; dynamic: number; initFailed: boolean; maxPerChunk: number } {
    let staticCount = 0;
    let dynamicCount = 0;
    for (const agg of this.aggregates.values()) {
      if (agg.body.mass === 0) staticCount++;
      else dynamicCount++;
    }
    return { total: this.aggregates.size, static: staticCount, dynamic: dynamicCount, initFailed: this.initFailed, maxPerChunk: MAX_BODIES_PER_CHUNK };
  }

  dispose(): void {
    for (const agg of this.aggregates.values()) {
      agg.dispose();
    }
    this.aggregates.clear();
    if (this.plugin) {
      this.plugin.dispose();
      this.plugin = null;
    }
    this.initialized = false;
  }
}

export const physicsService = new PhysicsService();

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

export class PhysicsService {
  private scene: Scene | null = null;
  private plugin: HavokPlugin | null = null;
  private aggregates = new Map<string, PhysicsAggregate>();
  private initialized = false;

  async init(scene: Scene): Promise<void> {
    if (this.initialized) return;

    try {
      const havokInstance = await (await import("@babylonjs/havok")).default();
      this.plugin = new HavokPlugin(true, havokInstance);
      scene.enablePhysics(new Vector3(0, -9.81, 0), this.plugin);
      this.scene = scene;
      this.initialized = true;
      console.log("[PhysicsService] Havok physics initialized.");
    } catch (err) {
      console.error("[PhysicsService] Failed to initialize Havok:", err);
    }
  }

  /** Add a static collider for a world object (house, wall, etc.). */
  addStaticCollider(
    id: string,
    mesh: Mesh,
    config?: Partial<PhysicsBodyConfig>
  ): void {
    if (!this.scene || !this.initialized) return;
    if (this.aggregates.has(id)) return;

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
    depth: number = 1
  ): void {
    if (!this.scene || !this.initialized) return;
    if (this.aggregates.has(id)) return;

    const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, {
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

  /** Check if physics is active. */
  isActive(): boolean {
    return this.initialized;
  }

  /** Get body count. */
  getBodyCount(): number {
    return this.aggregates.size;
  }

  /** Get stats. */
  getStats(): { total: number; static: number; dynamic: number } {
    let staticCount = 0;
    let dynamicCount = 0;
    for (const agg of this.aggregates.values()) {
      if (agg.body.mass === 0) staticCount++;
      else dynamicCount++;
    }
    return { total: this.aggregates.size, static: staticCount, dynamic: dynamicCount };
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

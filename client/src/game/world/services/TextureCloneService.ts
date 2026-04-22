/**
 * TextureCloneService — Master materials + cloning for efficient rendering.
 *
 * Creates ONE master material per texture kind, clones for all instances.
 * Prevents GPU memory exhaustion from unique materials per tree/object.
 *
 * Usage:
 *   const trunk = textureCloneService.clone(scene, "trunk", "tree-42-trunk");
 *   const leaf = textureCloneService.clone(scene, "leaf", "tree-42-leaf");
 */

import { Scene, StandardMaterial, Color3, Texture, DynamicTexture } from "@babylonjs/core";

export type TextureKind = "trunk" | "leaf" | "stone" | "grass" | "dirt" | "water" | "sand" | "metal" | "wood" | "cloth";

interface MasterEntry {
  material: StandardMaterial;
  kind: TextureKind;
}

interface TextureCloneStats {
  masterCount: number;
  cloneCount: number;
  kinds: Record<string, number>;
}

// Default colors per kind
const KIND_COLORS: Record<TextureKind, { diffuse: Color3; emissive: Color3 }> = {
  trunk:  { diffuse: new Color3(0.40, 0.26, 0.13), emissive: new Color3(0.05, 0.03, 0.01) },
  leaf:   { diffuse: new Color3(0.18, 0.50, 0.12), emissive: new Color3(0.02, 0.06, 0.01) },
  stone:  { diffuse: new Color3(0.50, 0.48, 0.45), emissive: new Color3(0.03, 0.03, 0.03) },
  grass:  { diffuse: new Color3(0.30, 0.55, 0.20), emissive: new Color3(0.02, 0.04, 0.01) },
  dirt:   { diffuse: new Color3(0.45, 0.33, 0.20), emissive: new Color3(0.03, 0.02, 0.01) },
  water:  { diffuse: new Color3(0.15, 0.30, 0.55), emissive: new Color3(0.02, 0.04, 0.08) },
  sand:   { diffuse: new Color3(0.76, 0.70, 0.50), emissive: new Color3(0.05, 0.04, 0.03) },
  metal:  { diffuse: new Color3(0.60, 0.60, 0.65), emissive: new Color3(0.05, 0.05, 0.06) },
  wood:   { diffuse: new Color3(0.55, 0.35, 0.17), emissive: new Color3(0.04, 0.02, 0.01) },
  cloth:  { diffuse: new Color3(0.60, 0.20, 0.20), emissive: new Color3(0.04, 0.01, 0.01) },
};

export class TextureCloneService {
  private masters = new Map<string, MasterEntry>();
  private cloneCount = 0;
  private kindCounts: Record<string, number> = {};

  /**
   * Get or create a master material for a texture kind.
   * Called once per kind; all subsequent calls return the cached master.
   */
  getMaster(scene: Scene, kind: TextureKind): StandardMaterial {
    const key = `${scene.uid}:${kind}`;
    if (this.masters.has(key)) {
      return this.masters.get(key)!.material;
    }

    const colors = KIND_COLORS[kind];
    const mat = new StandardMaterial(`master-${kind}`, scene);
    mat.diffuseColor = colors.diffuse.clone();
    mat.emissiveColor = colors.emissive.clone();
    mat.backFaceCulling = false;
    mat.freeze(); // Freeze for performance — clones are unfrozen automatically

    this.masters.set(key, { material: mat, kind });
    return mat;
  }

  /**
   * Clone a master material for a specific instance.
   * The clone shares the shader but has its own uniform values.
   */
  clone(scene: Scene, kind: TextureKind, instanceId: string): StandardMaterial {
    const master = this.getMaster(scene, kind);
    const clone = master.clone(`${instanceId}-${kind}-clone`);
    clone.unfreeze(); // Clones need to be mutable
    this.cloneCount++;
    this.kindCounts[kind] = (this.kindCounts[kind] || 0) + 1;
    return clone;
  }

  /**
   * Create a master material with a custom texture.
   */
  getMasterWithTexture(scene: Scene, kind: TextureKind, textureUrl: string): StandardMaterial {
    const key = `${scene.uid}:${kind}:tex:${textureUrl}`;
    if (this.masters.has(key)) {
      return this.masters.get(key)!.material;
    }

    const colors = KIND_COLORS[kind];
    const mat = new StandardMaterial(`master-${kind}-tex`, scene);
    mat.diffuseTexture = new Texture(textureUrl, scene);
    mat.diffuseColor = colors.diffuse.clone();
    mat.emissiveColor = colors.emissive.clone();
    mat.backFaceCulling = false;

    this.masters.set(key, { material: mat, kind });
    return mat;
  }

  /** Get stats for debug overlay. */
  getStats(): TextureCloneStats {
    return {
      masterCount: this.masters.size,
      cloneCount: this.cloneCount,
      kinds: { ...this.kindCounts },
    };
  }

  /** Dispose all masters and reset counters. */
  dispose(): void {
    for (const entry of this.masters.values()) {
      entry.material.dispose(false, true);
    }
    this.masters.clear();
    this.cloneCount = 0;
    this.kindCounts = {};
  }
}

export const textureCloneService = new TextureCloneService();

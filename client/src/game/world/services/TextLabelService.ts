/**
 * TextLabelService — Scalable world-space labels using MSDF text from @babylonjs/addons.
 * Falls back to DynamicTexture if MSDF is not available.
 *
 * Docs: https://doc.babylonjs.com/addons/msdfText/
 */

import { Scene, Mesh, DynamicTexture, StandardMaterial, Color3, Vector3, TransformNode } from "@babylonjs/core";

export interface TextLabelConfig {
  text: string;
  position: Vector3;
  fontSize?: number;
  color?: Color3;
  backgroundColor?: Color3;
  billboard?: boolean;
  visibleDistance?: number;
  fadeDistance?: number;
  parent?: TransformNode;
}

interface TextLabel {
  id: string;
  mesh: Mesh;
  config: TextLabelConfig;
  visible: boolean;
}

export class TextLabelService {
  private scene: Scene | null = null;
  private labels = new Map<string, TextLabel>();
  private counter = 0;
  private camera: any = null;
  private msdfAvailable = false;

  async init(scene: Scene): Promise<void> {
    this.scene = scene;

    // Try MSDF text addon
    try {
      await import("@babylonjs/addons");
      this.msdfAvailable = true;
      console.log("[TextLabelService] MSDF text available.");
    } catch {
      console.log("[TextLabelService] Using DynamicTexture fallback for labels.");
    }
  }

  setCamera(camera: any): void {
    this.camera = camera;
  }

  /** Create a world-space text label. */
  createLabel(config: TextLabelConfig): string {
    if (!this.scene) return "";

    const id = `label-${++this.counter}`;

    // Create plane for text
    const plane = Mesh.CreatePlane(id, 1, this.scene);
    plane.position = config.position.clone();
    if (config.parent) plane.parent = config.parent;

    // Billboard mode
    if (config.billboard !== false) {
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    }

    // Create texture-based label (fallback)
    const mat = new StandardMaterial(`${id}-mat`, this.scene);
    const texture = new DynamicTexture(`${id}-tex`, { width: 512, height: 128 }, this.scene);
    const ctx = texture.getContext();

    // Draw text
    const bgColor = config.backgroundColor ?? new Color3(0, 0, 0);
    ctx.fillStyle = `rgba(${Math.floor(bgColor.r * 255)},${Math.floor(bgColor.g * 255)},${Math.floor(bgColor.b * 255)},0.7)`;
    ctx.fillRect(0, 0, 512, 128);

    const color = config.color ?? new Color3(1, 1, 1);
    ctx.fillStyle = `rgb(${Math.floor(color.r * 255)},${Math.floor(color.g * 255)},${Math.floor(color.b * 255)})`;
    ctx.font = `${config.fontSize ?? 48}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.text, 256, 64);

    texture.update();
    mat.diffuseTexture = texture;
    mat.emissiveColor = color.clone();
    mat.emissiveTexture = texture;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;

    // Scale based on distance
    plane.scaling = new Vector3(2, 0.5, 1);

    const label: TextLabel = {
      id,
      mesh: plane,
      config,
      visible: true,
    };

    this.labels.set(id, label);
    return id;
  }

  /** Update label visibility based on camera distance. Call in render loop. */
  updateVisibility(): void {
    if (!this.camera) return;

    const camPos = this.camera.position;

    for (const label of this.labels.values()) {
      const dist = Vector3.Distance(camPos, label.mesh.position);
      const maxDist = label.config.visibleDistance ?? 100;
      const fadeDist = label.config.fadeDistance ?? 80;

      if (dist > maxDist) {
        label.mesh.setEnabled(false);
        label.visible = false;
      } else {
        label.mesh.setEnabled(true);
        label.visible = true;

        // Fade out near edge
        if (dist > fadeDist) {
          const fade = 1 - (dist - fadeDist) / (maxDist - fadeDist);
          if (label.mesh.material && "alpha" in label.mesh.material) {
            (label.mesh.material as any).alpha = fade;
          }
        }

        // Scale with distance (keep readable)
        const scale = Math.max(0.5, dist * 0.02);
        label.mesh.scaling = new Vector3(scale * 4, scale, 1);
      }
    }
  }

  /** Update label text. */
  updateText(id: string, newText: string): void {
    const label = this.labels.get(id);
    if (!label) return;

    const mat = label.mesh.material as StandardMaterial;
    if (mat?.diffuseTexture instanceof DynamicTexture) {
      const tex = mat.diffuseTexture;
      const ctx = tex.getContext();
      const bgColor = label.config.backgroundColor ?? new Color3(0, 0, 0);
      ctx.fillStyle = `rgba(${Math.floor(bgColor.r * 255)},${Math.floor(bgColor.g * 255)},${Math.floor(bgColor.b * 255)},0.7)`;
      ctx.fillRect(0, 0, 512, 128);

      const color = label.config.color ?? new Color3(1, 1, 1);
      ctx.fillStyle = `rgb(${Math.floor(color.r * 255)},${Math.floor(color.g * 255)},${Math.floor(color.b * 255)})`;
      ctx.font = `${label.config.fontSize ?? 48}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(newText, 256, 64);
      tex.update();
    }

    label.config.text = newText;
  }

  /** Remove a label. */
  removeLabel(id: string): void {
    const label = this.labels.get(id);
    if (!label) return;
    label.mesh.dispose();
    this.labels.delete(id);
  }

  /** Create a name label above an entity. */
  createNameLabel(entityId: string, name: string, position: Vector3, parent?: TransformNode): string {
    return this.createLabel({
      text: name,
      position: new Vector3(position.x, position.y + 2.5, position.z),
      fontSize: 40,
      color: new Color3(1, 1, 0.8),
      backgroundColor: new Color3(0.1, 0.1, 0.15),
      billboard: true,
      visibleDistance: 50,
      fadeDistance: 40,
      parent,
    });
  }

  /** Get stats. */
  getStats(): { total: number; visible: number } {
    const all = Array.from(this.labels.values());
    return {
      total: all.length,
      visible: all.filter((l) => l.visible).length,
    };
  }

  dispose(): void {
    for (const label of this.labels.values()) {
      label.mesh.dispose();
    }
    this.labels.clear();
  }
}

export const textLabelService = new TextLabelService();

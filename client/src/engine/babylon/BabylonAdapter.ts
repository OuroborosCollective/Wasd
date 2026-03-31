import {
  AbstractMesh,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { IEngineBridge } from "../bridge/IEngineBridge";
import { EntityViewModel } from "../bridge/EntityViewModel";
import { AssetRegistry } from "../playcanvas/AssetRegistry";

type EntityNode = {
  root: TransformNode;
  visual: TransformNode | AbstractMesh;
  label?: Mesh;
};

const DEFAULT_MODEL_BY_TYPE: Record<string, string> = {
  player: AssetRegistry.Npc_warrior ?? "/world-assets/characters/Npc_warrior.glb",
  npc: AssetRegistry.Questnpc_uschi ?? "/world-assets/characters/Questnpc_uschi.glb",
  monster: AssetRegistry.boar01 ?? "/world-assets/monsters/boar01.glb",
};

export class BabylonAdapter implements IEngineBridge {
  private readonly entities = new Map<string, EntityNode>();
  private readonly chunks = new Map<string, TransformNode>();
  private readonly loadedModels = new Map<string, AssetContainer>();
  private readonly modelAttachQueue = new Map<string, string>();
  private readonly pressedKeys = new Set<string>();
  private readonly inputCallbacks: Array<(input: any) => void> = [];
  private cameraTargetId: string | null = null;
  private navigationMarker: Mesh | null = null;
  private localPlayerId: string | null = null;
  private labelMaterialCounter = 0;

  constructor(
    private readonly scene: Scene,
    private readonly camera: ArcRotateCamera
  ) {
    this.bindKeyboard();
  }

  createEntity(model: EntityViewModel): void {
    const root = new TransformNode(model.id, this.scene);
    root.position = new Vector3(model.position.x, model.position.y, model.position.z);
    root.rotation = new Vector3(
      this.toRadians(model.rotation.x),
      this.toRadians(model.rotation.y),
      this.toRadians(model.rotation.z)
    );
    root.setEnabled(model.visible ?? true);

    const placeholder = this.createPlaceholderMesh(model);
    placeholder.parent = root;

    const node: EntityNode = { root, visual: placeholder };
    if (model.name) {
      node.label = this.createBillboardLabel(model.name, this.colorForType(model.type), root);
    }

    this.entities.set(model.id, node);
    this.tryAttachModel(model.id, model.modelUrl ?? DEFAULT_MODEL_BY_TYPE[model.type]);
  }

  updateEntity(id: string, updates: Partial<EntityViewModel>, dt: number = 0.016): void {
    const node = this.entities.get(id);
    if (!node) return;

    const lerpAlpha = Math.min(1, Math.max(0.12, dt * 12));
    if (updates.position) {
      const target = new Vector3(updates.position.x, updates.position.y, updates.position.z);
      node.root.position = Vector3.Lerp(node.root.position, target, lerpAlpha);
    }
    if (updates.rotation) {
      const targetEuler = new Vector3(
        this.toRadians(updates.rotation.x),
        this.toRadians(updates.rotation.y),
        this.toRadians(updates.rotation.z)
      );
      node.root.rotation = Vector3.Lerp(node.root.rotation, targetEuler, lerpAlpha);
    }
    if (updates.visible !== undefined) {
      node.root.setEnabled(updates.visible);
    }
    if (updates.name) {
      if (node.label) {
        node.label.dispose();
      }
      node.label = this.createBillboardLabel(
        updates.name,
        this.colorForType(updates.type ?? this.inferTypeFromEntityId(id)),
        node.root
      );
    }
    if (updates.modelUrl) {
      this.tryAttachModel(id, updates.modelUrl);
    }
  }

  destroyEntity(id: string): void {
    const node = this.entities.get(id);
    if (!node) return;
    node.root.dispose(false, true);
    this.entities.delete(id);
    if (this.cameraTargetId === id) {
      this.cameraTargetId = null;
    }
    if (this.localPlayerId === id) {
      this.localPlayerId = null;
    }
  }

  setCameraTarget(entityId: string): void {
    this.cameraTargetId = entityId;
    this.localPlayerId = entityId;
  }

  async loadModel(url: string): Promise<any> {
    return this.loadModelContainer(url);
  }

  createChunk(chunk: any): void {
    if (this.chunks.has(chunk.id)) return;
    const root = new TransformNode(`Chunk_${chunk.id}`, this.scene);
    root.position = new Vector3(chunk.chunkX * 16, 0, chunk.chunkY * 16);
    const ground = MeshBuilder.CreateGround(
      `Chunk_${chunk.id}_ground`,
      { width: 16, height: 16, subdivisions: 1 },
      this.scene
    );
    ground.parent = root;
    ground.position.y = -0.01;
    const mat = new StandardMaterial(`Chunk_${chunk.id}_mat`, this.scene);
    mat.diffuseColor = new Color3(0.22, 0.24, 0.28);
    mat.specularColor = new Color3(0, 0, 0);
    ground.material = mat;
    this.chunks.set(chunk.id, root);
  }

  destroyChunk(id: string): void {
    const chunk = this.chunks.get(id);
    if (!chunk) return;
    chunk.dispose(false, true);
    this.chunks.delete(id);
  }

  setNavigationTarget(position: { x: number; y: number; z: number } | null): void {
    if (!position) {
      if (this.navigationMarker) this.navigationMarker.setEnabled(false);
      return;
    }
    if (!this.navigationMarker) {
      this.navigationMarker = MeshBuilder.CreateTorus(
        "navigation-marker",
        { diameter: 1.5, thickness: 0.08, tessellation: 32 },
        this.scene
      );
      const mat = new StandardMaterial("navigation-marker-mat", this.scene);
      mat.emissiveColor = new Color3(0.2, 0.9, 0.3);
      mat.diffuseColor = new Color3(0.2, 0.9, 0.3);
      this.navigationMarker.material = mat;
      this.navigationMarker.rotation.x = Math.PI / 2;
    }
    this.navigationMarker.setEnabled(true);
    this.navigationMarker.position = new Vector3(position.x, position.y + 0.08, position.z);
  }

  triggerEntityAction(entityId: string, action: string): void {
    const node = this.entities.get(entityId);
    if (!node) return;
    if (action === "attack") {
      node.root.scaling = new Vector3(1.12, 1.12, 1.12);
      setTimeout(() => {
        const latest = this.entities.get(entityId);
        if (latest) latest.root.scaling = new Vector3(1, 1, 1);
      }, 120);
    }
  }

  playSound(_name: string): void {
    // Kept as no-op for first migration step.
  }

  onInput(callback: (input: any) => void): void {
    this.inputCallbacks.push(callback);
  }

  update(_dt: number): void {
    this.updateCameraFollow();
  }

  private updateCameraFollow(): void {
    if (!this.cameraTargetId) return;
    const targetNode = this.entities.get(this.cameraTargetId);
    if (!targetNode) return;
    const desiredTarget = targetNode.root.position.add(new Vector3(0, 1.4, 0));
    this.camera.target = Vector3.Lerp(this.camera.target, desiredTarget, 0.16);
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key) && !this.pressedKeys.has(key)) {
        this.pressedKeys.add(key);
        this.emitInput({ type: "keydown", key });
      }
      if (event.code === "Space") {
        this.emitAttack();
      }
      if (key === "e") {
        this.emitInteract();
      }
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key) && this.pressedKeys.has(key)) {
        this.pressedKeys.delete(key);
        this.emitInput({ type: "keyup", key });
      }
    });
  }

  private emitInput(input: any): void {
    for (const callback of this.inputCallbacks) {
      callback(input);
    }
  }

  private emitAttack(): void {
    const gameCore = (window as any).gameCore;
    if (gameCore && typeof gameCore.attack === "function") {
      gameCore.attack();
    }
  }

  private emitInteract(): void {
    const gameCore = (window as any).gameCore;
    if (gameCore && typeof gameCore.interact === "function") {
      gameCore.interact();
    }
  }

  private createPlaceholderMesh(model: EntityViewModel): Mesh {
    const color = this.colorForType(model.type);
    let mesh: Mesh;
    if (model.type === "player") {
      mesh = MeshBuilder.CreateCapsule(`${model.id}_capsule`, { height: 1.8, radius: 0.35 }, this.scene);
    } else if (model.type === "npc") {
      mesh = MeshBuilder.CreateCylinder(`${model.id}_npc`, { height: 1.6, diameter: 0.65 }, this.scene);
    } else if (model.type === "monster") {
      mesh = MeshBuilder.CreateBox(`${model.id}_monster`, { size: 1.1 }, this.scene);
    } else {
      mesh = MeshBuilder.CreateBox(`${model.id}_box`, { size: 0.9 }, this.scene);
    }
    const mat = new StandardMaterial(`${model.id}_placeholder_mat`, this.scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0, 0, 0);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }

  private createBillboardLabel(
    text: string,
    color: Color3,
    parent: TransformNode
  ): Mesh {
    const plane = MeshBuilder.CreatePlane(
      `label_${parent.name}_${this.labelMaterialCounter++}`,
      { width: 1.7, height: 0.42 },
      this.scene
    );
    plane.parent = parent;
    plane.position = new Vector3(0, 2.3, 0);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;

    const texture = new DynamicTexture(
      `label_tex_${parent.name}_${this.labelMaterialCounter}`,
      { width: 512, height: 128 },
      this.scene,
      false
    );
    texture.hasAlpha = true;
    const ctx = texture.getContext();
    if (ctx) {
      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 10, 496, 108);
      ctx.fillStyle = `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(
        color.b * 255
      )})`;
      ctx.font = "bold 58px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 64);
      texture.update();
    }

    const mat = new StandardMaterial(`label_mat_${parent.name}_${this.labelMaterialCounter}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    plane.material = mat;
    return plane;
  }

  private async loadModelContainer(url: string): Promise<AssetContainer> {
    const existing = this.loadedModels.get(url);
    if (existing) {
      return existing;
    }
    const splitIdx = url.lastIndexOf("/");
    const rootUrl = splitIdx >= 0 ? url.slice(0, splitIdx + 1) : "/";
    const fileName = splitIdx >= 0 ? url.slice(splitIdx + 1) : url;
    const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, fileName, this.scene);
    this.loadedModels.set(url, container);
    return container;
  }

  private async tryAttachModel(entityId: string, url?: string): Promise<void> {
    if (!url) return;
    const entity = this.entities.get(entityId);
    if (!entity) return;

    this.modelAttachQueue.set(entityId, url);
    const expectedUrl = url;
    try {
      const container = await this.loadModelContainer(url);
      if (this.modelAttachQueue.get(entityId) !== expectedUrl) {
        return;
      }

      const instance = container.instantiateModelsToScene((name) => `${entityId}_${name}`);
      const roots = instance.rootNodes.filter((node): node is TransformNode => node instanceof TransformNode);
      if (roots.length === 0) return;

      const modelRoot = roots[0];
      modelRoot.parent = entity.root;
      modelRoot.position = Vector3.Zero();
      modelRoot.rotationQuaternion = Quaternion.Identity();
      modelRoot.rotation = Vector3.Zero();
      modelRoot.scaling = new Vector3(0.01, 0.01, 0.01);

      if (entity.visual) {
        entity.visual.dispose(false, true);
      }
      entity.visual = modelRoot;
    } catch (error) {
      console.warn(`Failed to load model for ${entityId}:`, url, error);
    }
  }

  private colorForType(type?: string): Color3 {
    if (type === "player") return new Color3(0.25, 0.9, 0.4);
    if (type === "monster") return new Color3(0.95, 0.25, 0.25);
    if (type === "npc") return new Color3(0.35, 0.55, 1);
    if (type === "loot") return new Color3(0.95, 0.8, 0.2);
    return new Color3(0.85, 0.85, 0.85);
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private inferTypeFromEntityId(id: string): string {
    if (id.startsWith("player")) return "player";
    if (id.startsWith("npc")) return "npc";
    if (id.startsWith("monster")) return "monster";
    if (id.startsWith("loot")) return "loot";
    return "object";
  }
}

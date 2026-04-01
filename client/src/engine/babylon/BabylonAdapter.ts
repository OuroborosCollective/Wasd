import {
  AbstractMesh,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  DynamicTexture,
  Effect,
  Material,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  SceneLoader,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { IEngineBridge } from "../bridge/IEngineBridge";
import { EntityViewModel } from "../bridge/EntityViewModel";
import { AssetRegistry } from "../playcanvas/AssetRegistry";
import {
  DEFAULT_GROUND_BUMP,
  DEFAULT_GROUND_DIFFUSE,
  playgroundTextureUrl,
} from "./playgroundTextures";
import { applyTiledGroundTextures, chunkGroundUvScale } from "./groundTextureUtils";

type EntityNode = {
  root: TransformNode;
  visual: TransformNode | AbstractMesh;
  /** Set when a glTF attach succeeded; avoids re-running LoadAsset on every entity_sync. */
  attachedModelUrl?: string;
  /** URL currently being loaded (async); prevents duplicate concurrent loads for the same entity. */
  pendingModelUrl?: string;
  label?: Mesh;
  baseScale: number;
  areKappa: number;
  areLogicalIndex: number;
  areChain: string;
  arePhase: number;
  areResonance: number;
  arePlexity: number;
  areColor: Color3;
  areShader: ShaderMaterial | null;
  areMeshes: AbstractMesh[];
  areBaseMaterials: Map<number, Material | null>;
  explicitVisible: boolean;
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
  private readonly areWaveClock = { t: 0 };
  private readonly areDebugEnabled = new URLSearchParams(window.location.search).get("areDebug") === "1";
  private readonly areDebugElement: HTMLDivElement | null = null;
  private areMode: "off" | "cpu" | "shader" = "shader";
  private areShaderRegistered = false;
  private cameraTargetId: string | null = null;
  private navigationMarker: Mesh | null = null;
  private localPlayerId: string | null = null;
  private labelMaterialCounter = 0;

  constructor(
    private readonly scene: Scene,
    private readonly camera: ArcRotateCamera
  ) {
    const modeFromQuery = this.normalizeAREMode(new URLSearchParams(window.location.search).get("areMode"));
    if (modeFromQuery) {
      this.areMode = modeFromQuery;
    }
    if (this.areDebugEnabled) {
      this.areDebugElement = this.mountAREDebugOverlay();
    }
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

    const node: EntityNode = {
      root,
      visual: placeholder,
      baseScale: 1,
      areKappa: model.are?.kappa ?? 1000,
      areLogicalIndex: model.are?.logicalIndex ?? 0,
      areChain: model.are?.chain ?? "",
      arePhase: model.are?.phaseShift ?? 0,
      areResonance: model.are?.resonance ?? 0,
      arePlexity: model.are?.plexity ?? 1,
      areColor: this.colorForType(model.type),
      areShader: null,
      areMeshes: [placeholder],
      areBaseMaterials: new Map([[placeholder.uniqueId, placeholder.material as Material | null]]),
      explicitVisible: model.visible ?? true,
    };
    if (model.name) {
      node.label = this.createBillboardLabel(model.name, this.colorForType(model.type), root);
    }

    this.applyAREState(node, model);
    this.applyAREMaterialMode(node);
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
      node.explicitVisible = updates.visible;
      this.applyEntityVisibility(node);
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
    if (
      updates.modelUrl &&
      updates.modelUrl !== node.attachedModelUrl &&
      updates.modelUrl !== node.pendingModelUrl
    ) {
      this.tryAttachModel(id, updates.modelUrl);
    }
    if (updates.type) {
      node.areColor = this.colorForType(updates.type);
      this.updateAREShaderUniforms(node);
    }
    this.applyAREState(node, updates);
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
    mat.diffuseTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_DIFFUSE), this.scene, false, false);
    mat.bumpTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_BUMP), this.scene, false, false);
    applyTiledGroundTextures(mat, chunkGroundUvScale());
    mat.diffuseColor = new Color3(0.75, 0.78, 0.72);
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
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
      const boost = Math.max(1.12, node.baseScale * 1.08);
      node.root.scaling = new Vector3(boost, boost, boost);
      setTimeout(() => {
        const latest = this.entities.get(entityId);
        if (latest) {
          latest.root.scaling = new Vector3(latest.baseScale, latest.baseScale, latest.baseScale);
        }
      }, 120);
    }
  }

  playSound(_name: string): void {
    // Kept as no-op for first migration step.
  }

  onInput(callback: (input: any) => void): void {
    this.inputCallbacks.push(callback);
  }

  setAREMode(mode: string): void {
    const normalized = this.normalizeAREMode(mode);
    if (!normalized || normalized === this.areMode) {
      return;
    }
    this.areMode = normalized;
    for (const node of this.entities.values()) {
      this.applyAREMaterialMode(node);
      this.applyEntityVisibility(node);
    }
  }

  update(dt: number): void {
    this.areWaveClock.t += dt;
    this.updateAREVisuals();
    this.updateAREDebugOverlay();
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
    entity.pendingModelUrl = url;
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
      entity.attachedModelUrl = expectedUrl;
      entity.areMeshes = this.collectRenderableMeshes(modelRoot);
      entity.areBaseMaterials = new Map(
        entity.areMeshes.map((mesh) => [mesh.uniqueId, (mesh.material as Material | null) ?? null])
      );
      this.applyAREMaterialMode(entity);
      this.updateAREShaderUniforms(entity);
    } catch (error) {
      console.warn(`Failed to load model for ${entityId}:`, url, error);
    } finally {
      const latest = this.entities.get(entityId);
      if (latest && latest.pendingModelUrl === expectedUrl) {
        latest.pendingModelUrl = undefined;
      }
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

  private applyAREState(node: EntityNode, model: Partial<EntityViewModel>): void {
    if (model.are) {
      node.areKappa = Number.isFinite(model.are.kappa) ? model.are.kappa : node.areKappa;
      node.areLogicalIndex = Number.isFinite(model.are.logicalIndex)
        ? model.are.logicalIndex
        : node.areLogicalIndex;
      node.areChain = typeof model.are.chain === "string" ? model.are.chain : node.areChain;
      node.arePhase = Number.isFinite(model.are.phaseShift) ? model.are.phaseShift : node.arePhase;
      node.areResonance = Number.isFinite(model.are.resonance) ? model.are.resonance : node.areResonance;
      node.arePlexity = Number.isFinite(model.are.plexity)
        ? Math.max(0.05, Math.min(1, model.are.plexity))
        : node.arePlexity;
      node.baseScale = 0.7 + node.arePlexity * 0.6;
    }
    if (model.visible !== undefined) {
      node.explicitVisible = model.visible;
    }
    this.applyEntityVisibility(node);
    this.updateAREShaderUniforms(node);
  }

  private updateAREVisuals(): void {
    for (const node of this.entities.values()) {
      const wave = Math.sin(this.areWaveClock.t * 2 + node.arePhase * 0.01) * 0.05 * (0.25 + node.areResonance);
      let scale = this.areMode === "off" ? 1 : node.baseScale;
      if (this.areMode === "cpu") {
        scale = Math.max(0.2, node.baseScale + wave);
      }
      node.root.scaling = new Vector3(scale, scale, scale);
      // uTime-only updates for shader mode; avoid touching uniforms every frame in cpu/off
      if (this.areMode === "shader" && node.areShader) {
        node.areShader.setFloat("uTime", this.areWaveClock.t);
      }
    }
  }

  private collectRenderableMeshes(node: TransformNode | AbstractMesh): AbstractMesh[] {
    if (node instanceof AbstractMesh) {
      return [node];
    }
    return node.getChildMeshes(false);
  }

  private applyEntityVisibility(node: EntityNode): void {
    const visibleByPlexity = this.areMode === "off" ? true : node.arePlexity > 0.08;
    node.root.setEnabled(visibleByPlexity && node.explicitVisible);
  }

  private applyAREMaterialMode(node: EntityNode): void {
    if (this.areMode === "shader") {
      const shader = this.ensureAREShader(node);
      for (const mesh of node.areMeshes) {
        mesh.material = shader;
      }
      this.updateAREShaderUniforms(node);
      return;
    }
    for (const mesh of node.areMeshes) {
      if (node.areBaseMaterials.has(mesh.uniqueId)) {
        mesh.material = node.areBaseMaterials.get(mesh.uniqueId) ?? null;
      }
    }
  }

  private ensureAREShader(node: EntityNode): ShaderMaterial {
    if (node.areShader) {
      return node.areShader;
    }
    this.ensureAREShaderRegistered();
    const shader = new ShaderMaterial(
      `are_shader_${node.root.name}`,
      this.scene,
      { vertex: "are", fragment: "are" },
      {
        attributes: ["position"],
        uniforms: [
          "worldViewProjection",
          "uTime",
          "uPhase",
          "uResonance",
          "uPlexity",
          "uColor",
        ],
      }
    );
    shader.backFaceCulling = false;
    node.areShader = shader;
    return shader;
  }

  private ensureAREShaderRegistered(): void {
    if (this.areShaderRegistered) {
      return;
    }
    this.areShaderRegistered = true;
    Effect.ShadersStore.areVertexShader = `
      precision highp float;
      attribute vec3 position;
      uniform mat4 worldViewProjection;
      uniform float uTime;
      uniform float uPhase;
      uniform float uResonance;
      uniform float uPlexity;
      varying float vWave;
      void main(void) {
        float amp = (0.03 + uResonance * 0.06) * max(0.1, uPlexity);
        float wave = sin(uTime * 2.5 + uPhase * 0.01 + position.y * 2.0) * amp;
        vec3 displaced = position + vec3(0.0, wave, 0.0);
        vWave = wave;
        gl_Position = worldViewProjection * vec4(displaced, 1.0);
      }
    `;
    Effect.ShadersStore.areFragmentShader = `
      precision highp float;
      uniform vec3 uColor;
      uniform float uPlexity;
      uniform float uResonance;
      varying float vWave;
      void main(void) {
        float glow = 0.55 + uResonance * 0.35 + abs(vWave) * 3.0;
        vec3 color = uColor * glow;
        color = mix(color * 0.35, color, clamp(uPlexity, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  private updateAREShaderUniforms(node: EntityNode): void {
    if (!node.areShader) {
      return;
    }
    node.areShader.setFloat("uTime", this.areWaveClock.t);
    node.areShader.setFloat("uPhase", node.arePhase);
    node.areShader.setFloat("uResonance", node.areResonance);
    node.areShader.setFloat("uPlexity", node.arePlexity);
    node.areShader.setColor3("uColor", node.areColor);
  }

  private normalizeAREMode(mode: unknown): "off" | "cpu" | "shader" | null {
    if (typeof mode !== "string") return null;
    const value = mode.trim().toLowerCase();
    if (value === "off") return "off";
    if (value === "cpu") return "cpu";
    if (value === "shader" || value === "on" || value === "are" || value === "true") return "shader";
    return null;
  }

  private mountAREDebugOverlay(): HTMLDivElement {
    const node = document.createElement("div");
    node.id = "are-debug-overlay";
    node.style.position = "fixed";
    node.style.top = "12px";
    node.style.right = "12px";
    node.style.zIndex = "10000";
    node.style.padding = "10px";
    node.style.minWidth = "220px";
    node.style.background = "rgba(0,0,0,0.62)";
    node.style.border = "1px solid rgba(95,160,255,0.5)";
    node.style.borderRadius = "8px";
    node.style.color = "#d7e6ff";
    node.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    node.style.fontSize = "11px";
    node.style.whiteSpace = "pre";
    document.body.appendChild(node);
    return node;
  }

  private updateAREDebugOverlay(): void {
    if (!this.areDebugEnabled || !this.areDebugElement) {
      return;
    }
    let visible = 0;
    let resonance = 0;
    let plexity = 0;
    for (const node of this.entities.values()) {
      if (node.root.isEnabled()) visible += 1;
      resonance += node.areResonance;
      plexity += node.arePlexity;
    }
    const count = this.entities.size || 1;
    const localNode = this.localPlayerId ? this.entities.get(this.localPlayerId) : null;
    this.areDebugElement.textContent = [
      "ARE DEBUG",
      `mode: ${this.areMode}`,
      `entities: ${this.entities.size} (visible ${visible})`,
      `avg resonance: ${(resonance / count).toFixed(3)}`,
      `avg plexity: ${(plexity / count).toFixed(3)}`,
      `wave t: ${this.areWaveClock.t.toFixed(2)}`,
      localNode
        ? `local: k=${localNode.areKappa} idx=${localNode.areLogicalIndex}\nlocal: phase=${localNode.arePhase.toFixed(1)} res=${localNode.areResonance.toFixed(2)} plex=${localNode.arePlexity.toFixed(2)}\nchain: ${localNode.areChain.slice(0, 42)}`
        : "local: -",
    ].join("\n");
  }

  private inferTypeFromEntityId(id: string): string {
    if (id.startsWith("player")) return "player";
    if (id.startsWith("npc")) return "npc";
    if (id.startsWith("monster")) return "monster";
    if (id.startsWith("loot")) return "loot";
    return "object";
  }
}

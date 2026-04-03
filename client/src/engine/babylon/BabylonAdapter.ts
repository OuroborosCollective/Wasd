import {
  AbstractMesh,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  DynamicTexture,
  Effect,
  Material,
  Matrix,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Quaternion,
  Scene,
  SceneLoader,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  Viewport,
} from "@babylonjs/core";
import { Sound } from "@babylonjs/core/Audio/sound";
import { IEngineBridge } from "../bridge/IEngineBridge";
import { EntityViewModel } from "../bridge/EntityViewModel";
import {
  DEFAULT_GROUND_BUMP,
  DEFAULT_GROUND_DIFFUSE,
  playgroundTextureUrl,
} from "./playgroundTextures";
import { applyTiledGroundTextures, chunkGroundUvScale } from "./groundTextureUtils";
import { makeSoftClickWavDataUrl } from "./tinyWav";
import { getQuickCastSkillId } from "../../game/combatSkills";
import { isAndroid, prefersCompactTouchUi } from "../../ui/touchUi";

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
  /** Latest merged view-model for targeting UI (server-driven fields may lag one sync) */
  _vm?: EntityViewModel;
};

/** Prefer `/assets/models/*` — always present in minimal client dist; `/world-assets` may be missing on VPS. */
const DEFAULT_MODEL_BY_TYPE: Record<string, string> = {
  player: "/assets/models/characters/uschi.glb",
  npc: "/assets/models/characters/uschi.glb",
  monster: "/assets/models/monsters/goblin.glb",
  loot: "/assets/models/objects/chest.glb",
  object: "/assets/models/objects/chest.glb",
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
  /** Default `shader` on desktop; `off` on touch phones (ARE vertex shader per mesh is very expensive). */
  private areMode: "off" | "cpu" | "shader" = prefersCompactTouchUi() ? "off" : "shader";
  private areShaderRegistered = false;
  private cameraTargetId: string | null = null;
  private navigationMarker: Mesh | null = null;
  private localPlayerId: string | null = null;
  private labelMaterialCounter = 0;
  private targetReticleEl: HTMLDivElement | null = null;
  private targetReticleEntityId: string | null = null;
  private audioCtx: AudioContext | null = null;
  private babylonUiSound: Sound | null = null;
  private babylonUiSoundReady = false;
  private lockedTargetEntityId: string | null = null;
  private combatTargetPickHandler: ((entityId: string | null) => void) | null = null;
  private hoverTooltipEl: HTMLDivElement | null = null;
  private lastHoverPickMs = 0;
  private lastReticleUpdateMs = 0;
  /** Serialize GLB decode on Android — parallel SceneLoader spikes RAM and kills the tab. */
  private androidModelAttachChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly scene: Scene,
    private readonly camera: ArcRotateCamera
  ) {
    const modeFromQuery = this.normalizeAREMode(new URLSearchParams(window.location.search).get("areMode"));
    if (modeFromQuery) {
      this.areMode = modeFromQuery;
    } else if (prefersCompactTouchUi()) {
      this.areMode = "off";
    }
    if (this.areDebugEnabled) {
      this.areDebugElement = this.mountAREDebugOverlay();
    }
    this.bindKeyboard();
    this.mountTargetReticle();
    this.mountHoverTooltip();
    this.initBabylonUiSound();
    this.bindCombatTargetPicking();
  }

  setCombatTargetPickHandler(handler: ((entityId: string | null) => void) | null): void {
    this.combatTargetPickHandler = handler;
  }

  private bindCombatTargetPicking() {
    this.scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERTAP) return;
      const evt = pi.event as PointerEvent;
      if (evt.button !== 0) return;
      const canvas = this.scene.getEngine().getRenderingCanvas();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (
        evt.clientX < rect.left ||
        evt.clientX > rect.right ||
        evt.clientY < rect.top ||
        evt.clientY > rect.bottom
      ) {
        return;
      }
      if (!this.combatTargetPickHandler || !this.localPlayerId) return;

      /** Explicit pick with pickable-only filter — `pickInfo` can hit non-pickable geometry first (mobile crash / miss). */
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const pick = this.scene.pick(sx, sy, (m) => {
        if (m.isPickable !== true || typeof m.name !== "string") return false;
        if (m.name.startsWith("label_")) return false;
        return true;
      });
      if (!pick?.hit || !pick.pickedMesh) {
        this.lockedTargetEntityId = null;
        this.combatTargetPickHandler(null);
        return;
      }

      let cur: TransformNode | AbstractMesh | null = pick.pickedMesh;
      while (cur) {
        if (cur instanceof TransformNode && this.entities.has(cur.name)) {
          const id = cur.name;
          if (id === this.localPlayerId) return;
          const meta = this.entities.get(id)?._vm;
          const lockable = meta?.combatThreat === true || meta?.id === "npc_dummy";
          if (lockable) {
            this.lockedTargetEntityId = id;
            this.combatTargetPickHandler(id);
            return;
          }
          this.lockedTargetEntityId = null;
          this.combatTargetPickHandler(null);
          return;
        }
        cur = cur.parent as TransformNode | AbstractMesh | null;
      }
    });
  }

  private initBabylonUiSound() {
    try {
      const url = makeSoftClickWavDataUrl();
      this.babylonUiSound = new Sound("arel-ui-sfx", url, this.scene, () => {
        this.babylonUiSoundReady = true;
      });
    } catch {
      this.babylonUiSound = null;
    }
  }

  private mountHoverTooltip() {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.id = "world-hover-tooltip";
    el.style.cssText = [
      "display:none",
      "position:fixed",
      "z-index:5900",
      "pointer-events:none",
      "transform:translate(-50%,-108%)",
      "max-width:min(280px,50vw)",
      "padding:8px 10px",
      "border-radius:8px",
      "background:rgba(10,12,20,0.92)",
      "border:1px solid rgba(120,160,255,0.35)",
      "color:#e8ecf5",
      "font-family:system-ui,sans-serif",
      "font-size:12px",
      "line-height:1.35",
      "box-shadow:0 4px 14px rgba(0,0,0,0.5)",
    ].join(";");
    document.body.appendChild(el);
    this.hoverTooltipEl = el;
  }

  private buildWorldTooltipHtml(vm: EntityViewModel): string {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const name = vm.name || vm.id;
    if (vm.type === "player" && vm.id !== this.localPlayerId) {
      return `<strong>${esc(name)}</strong><div style="opacity:0.8;margin-top:2px;">Player</div>`;
    }
    if (vm.type === "npc") {
      const role = vm.role ? esc(vm.role) : "";
      const fac = vm.faction ? esc(vm.faction) : "";
      const meta = [role, fac].filter(Boolean).join(" · ");
      let hp = "";
      if (typeof vm.health === "number" && typeof vm.maxHealth === "number") {
        hp = `<div style="margin-top:4px;opacity:0.9;">HP ${Math.max(0, Math.round(vm.health))} / ${Math.round(
          vm.maxHealth
        )}</div>`;
      }
      return `<strong>${esc(name)}</strong>${
        meta ? `<div style="opacity:0.82;margin-top:2px;">${meta}</div>` : ""
      }${hp}`;
    }
    if (vm.type === "monster") {
      let hp = "";
      if (typeof vm.health === "number" && typeof vm.maxHealth === "number") {
        hp = `<div style="margin-top:4px;">HP ${Math.max(0, Math.round(vm.health))} / ${Math.round(
          vm.maxHealth
        )}</div>`;
      }
      return `<strong>${esc(name)}</strong>${hp}`;
    }
    if (vm.type === "loot") {
      if (vm.lootKind === "gold" && typeof vm.goldAmount === "number") {
        return `<strong>Gold</strong><div style="opacity:0.85;margin-top:2px;">${vm.goldAmount} coins</div>`;
      }
      const iname = vm.lootItemName || vm.lootItemId || "Item drop";
      return `<strong>${esc(String(iname))}</strong><div style="opacity:0.8;margin-top:2px;">Loot</div>`;
    }
    return `<strong>${esc(name)}</strong>`;
  }

  private updateHoverTooltip() {
    if (!this.hoverTooltipEl) return;
    /** Hover uses scene.pick every interval — disable on touch entirely (Android still fires pointer move). */
    if (prefersCompactTouchUi()) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastHoverPickMs < 120) return;
    this.lastHoverPickMs = now;

    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }
    const px = this.scene.pointerX;
    const py = this.scene.pointerY;
    if (px <= 0 && py <= 0) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }
    const pick = this.scene.pick(
      px,
      py,
      (m) => m.isPickable !== false && typeof m.name === "string" && !m.name.startsWith("label_")
    );
    if (!pick?.hit || !pick.pickedMesh) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }

    let cur: TransformNode | AbstractMesh | null = pick.pickedMesh;
    while (cur) {
      if (cur instanceof TransformNode && this.entities.has(cur.name)) {
        const id = cur.name;
        const vm = this.entities.get(id)?._vm;
        if (vm) {
          this.hoverTooltipEl.innerHTML = this.buildWorldTooltipHtml(vm);
          this.hoverTooltipEl.style.display = "block";
          this.hoverTooltipEl.style.left = `${px}px`;
          this.hoverTooltipEl.style.top = `${py}px`;
          return;
        }
      }
      cur = cur.parent as TransformNode | AbstractMesh | null;
    }
    this.hoverTooltipEl.style.display = "none";
  }

  private mountTargetReticle() {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.id = "world-target-reticle";
    el.style.cssText = [
      "display:none",
      "position:fixed",
      "width:48px",
      "height:48px",
      "border:2px solid #ff4d4d",
      "border-radius:50%",
      "pointer-events:none",
      "transform:translate(-50%,-50%)",
      "z-index:5000",
      "box-shadow:0 0 10px rgba(255,77,77,0.6), inset 0 0 10px rgba(255,77,77,0.4)",
      "transition:width 0.15s ease-out, height 0.15s ease-out",
    ].join(";");
    const dot = document.createElement("div");
    dot.style.cssText =
      "position:absolute;top:50%;left:50%;width:4px;height:4px;background:#ff4d4d;border-radius:50%;transform:translate(-50%,-50%)";
    el.appendChild(dot);
    document.body.appendChild(el);
    this.targetReticleEl = el;
  }

  private updateTargetReticle() {
    if (!this.targetReticleEl) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastReticleUpdateMs < 16) return;
    this.lastReticleUpdateMs = now;

    const id = this.lockedTargetEntityId;
    if (!id) {
      this.targetReticleEl.style.display = "none";
      this.targetReticleEntityId = null;
      return;
    }
    const node = this.entities.get(id);
    if (!node || !node.root.isEnabled()) {
      this.targetReticleEl.style.display = "none";
      this.targetReticleEntityId = null;
      return;
    }

    const pos = node.root.getAbsolutePosition();
    const screen = Vector3.Project(
      pos,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
    );

    if (screen.z < 0 || screen.z > 1) {
      this.targetReticleEl.style.display = "none";
      return;
    }

    this.targetReticleEl.style.display = "block";
    this.targetReticleEl.style.left = `${screen.x}px`;
    this.targetReticleEl.style.top = `${screen.y}px`;

    if (this.targetReticleEntityId !== id) {
      this.targetReticleEntityId = id;
      this.targetReticleEl.style.width = "64px";
      this.targetReticleEl.style.height = "64px";
      setTimeout(() => {
        if (this.targetReticleEntityId === id) {
          this.targetReticleEl!.style.width = "48px";
          this.targetReticleEl!.style.height = "48px";
        }
      }, 150);
    }
  }

  private bindKeyboard() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (this.isInputFocused()) return;
      this.pressedKeys.add(e.code);
    });
    window.addEventListener("keyup", (e) => {
      this.pressedKeys.delete(e.code);
    });
  }

  private isInputFocused(): boolean {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    if (!active) return false;
    return active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).isContentEditable;
  }

  onInput(callback: (input: any) => void): void {
    this.inputCallbacks.push(callback);
  }

  update(dt: number): void {
    this.areWaveClock.t += dt;
    this.updateAREShaderTime();
    this.processInput();
    this.updateTargetReticle();
    this.updateHoverTooltip();
  }

  private processInput() {
    const input: any = {
      up: this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp"),
      down: this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown"),
      left: this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft"),
      right: this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight"),
      skill1: this.pressedKeys.has("Digit1"),
      skill2: this.pressedKeys.has("Digit2"),
      skill3: this.pressedKeys.has("Digit3"),
      skill4: this.pressedKeys.has("Digit4"),
    };

    if (this.pressedKeys.has("KeyQ")) {
      const qid = getQuickCastSkillId(1);
      if (qid) input.skill1 = true;
    }
    if (this.pressedKeys.has("KeyE")) {
      const qid = getQuickCastSkillId(2);
      if (qid) input.skill2 = true;
    }

    if (Object.values(input).some((v) => v)) {
      for (const cb of this.inputCallbacks) {
        cb(input);
      }
    }
  }

  playAudio(id: string, url: string, volume: number = 0.5): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    this.loadAndPlayBuffer(url, volume);
  }

  private async loadAndPlayBuffer(url: string, volume: number) {
    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.audioCtx!.decodeAudioData(arrayBuffer);
      const source = this.audioCtx!.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = this.audioCtx!.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(this.audioCtx!.destination);
      source.start(0);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }

  playBeep(frequency: number, durationSec: number, volume: number = 0.1): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const now = this.audioCtx.currentTime;
    const src = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    src.type = "sine";
    src.frequency.setValueAtTime(frequency, now);
    src.connect(gain);
    gain.connect(this.audioCtx.destination);
    gain.gain.setValueAtTime(volume * 0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    src.start(now);
    src.stop(now + durationSec + 0.02);
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
    node._vm = { ...model };
    this.entities.set(model.id, node);
    this.enqueueModelAttach(model.id, model.modelUrl ?? DEFAULT_MODEL_BY_TYPE[model.type]);
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

    const nextName = typeof updates.name === "string" ? updates.name.trim() : "";
    const prevName = (node._vm?.name && String(node._vm.name).trim()) || "";
    if (nextName && nextName !== prevName) {
      if (node.label) {
        node.label.dispose(false, true);
      }
      node.label = this.createBillboardLabel(
        nextName,
        this.colorForType(updates.type ?? this.inferTypeFromEntityId(id)),
        node.root
      );
    }
    if (
      updates.modelUrl &&
      updates.modelUrl !== node.attachedModelUrl &&
      updates.modelUrl !== node.pendingModelUrl
    ) {
      this.enqueueModelAttach(id, updates.modelUrl);
    }
    if (updates.type) {
      node.areColor = this.colorForType(updates.type);
      this.updateAREShaderUniforms(node);
    }
    this.applyAREState(node, updates);
    const prevVm = node._vm;
    node._vm = {
      ...(prevVm ?? {
        id,
        type: this.inferTypeFromEntityId(id),
        position: {
          x: node.root.position.x,
          y: node.root.position.y,
          z: node.root.position.z,
        },
        rotation: { x: 0, y: 0, z: 0 },
        visible: node.explicitVisible,
      }),
      ...updates,
      id: prevVm?.id ?? id,
    };
  }

  destroyEntity(id: string): void {
    const node = this.entities.get(id);
    if (!node) return;
    node.root.dispose(false, true);
    if (node.areShader) {
      node.areShader.dispose();
      node.areShader = null;
    }
    this.entities.delete(id);
    if (this.cameraTargetId === id) {
      this.cameraTargetId = null;
    }
    if (this.localPlayerId === id) {
      this.localPlayerId = null;
    }
    if (this.targetReticleEntityId === id) {
      this.targetReticleEntityId = null;
      if (this.targetReticleEl) this.targetReticleEl.style.display = "none";
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
      { width: 16, height: 16, subdivisions: 4 },
      this.scene
    );
    ground.parent = root;
    ground.position = new Vector3(8, 0, 8);
    ground.isPickable = false;
    applyTiledGroundTextures(ground, chunk.biome, chunkGroundUvScale);
    this.chunks.set(chunk.id, root);
  }

  removeChunk(id: string): void {
    const root = this.chunks.get(id);
    if (root) {
      root.dispose();
      this.chunks.delete(id);
    }
  }

  private createBillboardLabel(text: string, color: Color3, parent: TransformNode): Mesh {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return MeshBuilder.CreatePlane("label_error", { size: 1 }, this.scene);

    const fontSize = 48;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    canvas.width = Math.pow(2, Math.ceil(Math.log2(metrics.width + 32)));
    canvas.height = 64;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.roundRect?.(0, 0, canvas.width, canvas.height, 12);
    ctx.fill();

    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color.toHexString();
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new DynamicTexture(`label_tex_${this.labelMaterialCounter++}`, canvas, this.scene, false);
    texture.hasAlpha = true;

    const mat = new StandardMaterial(`label_mat_${this.labelMaterialCounter}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = Color3.White();
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;

    const plane = MeshBuilder.CreatePlane(`label_${parent.name}`, { width: canvas.width / 100, height: 0.64 }, this.scene);
    plane.material = mat;
    plane.parent = parent;
    plane.position = new Vector3(0, 2.2, 0);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;

    return plane;
  }

  private createPlaceholderMesh(model: EntityViewModel): Mesh {
    const mesh = MeshBuilder.CreateBox(`placeholder_${model.id}`, { size: 1 }, this.scene);
    const mat = new StandardMaterial(`mat_placeholder_${model.id}`, this.scene);
    mat.diffuseColor = this.colorForType(model.type);
    mesh.material = mat;
    mesh.position.y = 0.5;
    return mesh;
  }

  private colorForType(type: string): Color3 {
    switch (type) {
      case "player":
        return new Color3(0.4, 0.6, 1.0);
      case "npc":
        return new Color3(0.4, 1.0, 0.4);
      case "monster":
        return new Color3(1.0, 0.4, 0.4);
      case "loot":
        return new Color3(1.0, 0.9, 0.3);
      default:
        return new Color3(0.8, 0.8, 0.8);
    }
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private normalizeAREMode(mode: string | null): "off" | "cpu" | "shader" | null {
    if (mode === "off" || mode === "cpu" || mode === "shader") return mode;
    return null;
  }

  private mountAREDebugOverlay(): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.7);color:#0f0;padding:10px;font-family:monospace;z-index:9999;pointer-events:none;font-size:12px;border-radius:4px;border:1px solid #0f0";
    document.body.appendChild(el);
    return el;
  }

  private updateAREShaderTime() {
    if (this.areMode !== "shader") return;
    for (const node of this.entities.values()) {
      if (node.areShader) {
        node.areShader.setFloat("time", this.areWaveClock.t);
      }
    }
  }

  private updateAREShaderUniforms(node: EntityNode) {
    if (!node.areShader) return;
    node.areShader.setFloat("kappa", node.areKappa);
    node.areShader.setFloat("logicalIndex", node.areLogicalIndex);
    node.areShader.setColor3("baseColor", node.areColor);
    node.areShader.setFloat("resonance", node.areResonance);
    node.areShader.setFloat("plexity", node.arePlexity);
    node.areShader.setFloat("phaseShift", node.arePhase);
  }

  private applyAREState(node: EntityNode, updates: Partial<EntityViewModel>) {
    if (updates.are?.kappa !== undefined) node.areKappa = updates.are.kappa;
    if (updates.are?.logicalIndex !== undefined) node.areLogicalIndex = updates.are.logicalIndex;
    if (updates.are?.chain !== undefined) node.areChain = updates.are.chain;
    if (updates.are?.phaseShift !== undefined) node.arePhase = updates.are.phaseShift;
    if (updates.are?.resonance !== undefined) node.areResonance = updates.are.resonance;
    if (updates.are?.plexity !== undefined) node.arePlexity = updates.are.plexity;
    this.updateAREShaderUniforms(node);
  }

  private applyAREMaterialMode(node: EntityNode) {
    // Placeholder for shader application logic
  }

  private applyEntityVisibility(node: EntityNode) {
    node.root.setEnabled(node.explicitVisible);
  }

  private inferTypeFromEntityId(id: string): string {
    if (id.startsWith("p_")) return "player";
    if (id.startsWith("m_")) return "monster";
    if (id.startsWith("npc_")) return "npc";
    if (id.startsWith("loot_")) return "loot";
    return "object";
  }

  private async loadModelContainer(url: string): Promise<AssetContainer> {
    if (this.loadedModels.has(url)) return this.loadedModels.get(url)!;
    const container = await SceneLoader.LoadAssetContainerAsync("", url, this.scene);
    this.loadedModels.set(url, container);
    return container;
  }

  private enqueueModelAttach(id: string, url: string) {
    const node = this.entities.get(id);
    if (!node) return;
    node.pendingModelUrl = url;
    
    const task = async () => {
      try {
        const container = await this.loadModelContainer(url);
        if (node.pendingModelUrl !== url) return;
        
        node.visual.dispose();
        const instance = container.instantiateModelsToScene();
        const visual = instance.rootNodes[0] as TransformNode;
        visual.parent = node.root;
        node.visual = visual;
        node.attachedModelUrl = url;
        node.pendingModelUrl = undefined;
        
        node.areMeshes = visual.getChildMeshes();
        this.applyAREMaterialMode(node);
      } catch (e) {
        console.error("Model attach failed", e);
      }
    };

    if (isAndroid()) {
      this.androidModelAttachChain = this.androidModelAttachChain.then(task);
    } else {
      task();
    }
  }
}
// Webhook test commit: Thu Apr  2 19:40:44 EDT 2026

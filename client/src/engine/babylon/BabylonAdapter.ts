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
import { AssetRegistry } from "./AssetRegistry";
import {
  DEFAULT_GROUND_BUMP,
  DEFAULT_GROUND_DIFFUSE,
  playgroundTextureUrl,
} from "./playgroundTextures";
import { applyTiledGroundTextures, chunkGroundUvScale } from "./groundTextureUtils";
import { makeSoftClickWavDataUrl } from "./tinyWav";
import { getQuickCastSkillId } from "../../game/combatSkills";
import { prefersCompactTouchUi } from "../../ui/touchUi";

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

      const pick = pi.pickInfo;
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
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const touch = prefersCompactTouchUi();
    if (touch && now - this.lastHoverPickMs < 220) return;
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
    let entityId: string | null = null;
    while (cur) {
      if (cur instanceof TransformNode && this.entities.has(cur.name)) {
        entityId = cur.name;
        break;
      }
      cur = cur.parent as TransformNode | AbstractMesh | null;
    }
    if (!entityId || entityId === this.localPlayerId) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }
    const node = this.entities.get(entityId);
    const vm = node?._vm;
    if (!vm) {
      this.hoverTooltipEl.style.display = "none";
      return;
    }
    this.hoverTooltipEl.innerHTML = this.buildWorldTooltipHtml(vm);
    const head = node.root.position.add(new Vector3(0, 2.1, 0));
    const screen = this.projectWorldToScreen(head);
    if (!screen) return;
    this.hoverTooltipEl.style.left = `${screen.x}px`;
    this.hoverTooltipEl.style.top = `${screen.y}px`;
    this.hoverTooltipEl.style.display = "block";
  }

  private mountTargetReticle() {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.id = "combat-target-reticle";
    el.style.cssText = [
      "display:none",
      "position:fixed",
      "z-index:6000",
      "pointer-events:none",
      "transform:translate(-50%,-100%)",
      "min-width:120px",
      "max-width:min(240px,40vw)",
      "padding:6px 10px",
      "border-radius:8px",
      "background:rgba(12,14,24,0.88)",
      "border:1px solid rgba(255,120,80,0.45)",
      "color:#f0f2fa",
      "font-family:system-ui,sans-serif",
      "font-size:12px",
      "line-height:1.25",
      "box-shadow:0 4px 14px rgba(0,0,0,0.45)",
    ].join(";");
    document.body.appendChild(el);
    this.targetReticleEl = el;
  }

  private projectWorldToScreen(world: Vector3): { x: number; y: number } | null {
    const engine = this.scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return null;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return null;
    const projected = Vector3.Project(
      world,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      new Viewport(0, 0, w, h)
    );
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + projected.x, y: rect.top + projected.y };
  }

  private updateTargetReticle() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const touch = prefersCompactTouchUi();
    if (touch && now - this.lastReticleUpdateMs < 120) return;
    this.lastReticleUpdateMs = now;

    if (!this.targetReticleEl || !this.localPlayerId) {
      if (this.targetReticleEl) this.targetReticleEl.style.display = "none";
      this.targetReticleEntityId = null;
      return;
    }
    const playerNode = this.entities.get(this.localPlayerId);
    if (!playerNode) {
      this.targetReticleEl.style.display = "none";
      this.targetReticleEntityId = null;
      return;
    }
    const px = playerNode.root.position.x;
    const pz = playerNode.root.position.z;
    const maxR = 55;
    let bestId: string | null = null;
    let bestD2 = Infinity;
    let bestName = "";
    let bestHp = 0;
    let bestHpMax = 1;

    const consider = (id: string, node: EntityNode) => {
      const dx = node.root.position.x - px;
      const dz = node.root.position.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > maxR * maxR) return;
      const meta = node._vm;
      const isThreat = meta?.combatThreat === true;
      const isDummy = meta?.id === "npc_dummy";
      if (!isThreat && !isDummy) return;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestId = id;
        bestName = meta?.name || id;
        bestHp = typeof meta?.health === "number" ? meta.health : 0;
        bestHpMax = Math.max(1, typeof meta?.maxHealth === "number" ? meta.maxHealth : 100);
      }
    };

    if (this.lockedTargetEntityId) {
      const locked = this.entities.get(this.lockedTargetEntityId);
      if (locked) {
        consider(this.lockedTargetEntityId, locked);
      } else {
        this.lockedTargetEntityId = null;
      }
    }
    if (!bestId) {
      for (const [id, node] of this.entities) {
        if (id === this.localPlayerId) continue;
        consider(id, node);
      }
    }
    if (!bestId) {
      this.targetReticleEl.style.display = "none";
      this.targetReticleEntityId = null;
      return;
    }
    this.targetReticleEntityId = bestId;
    const targetNode = this.entities.get(bestId);
    if (!targetNode) return;
    const head = targetNode.root.position.add(new Vector3(0, 2.2, 0));
    const screen = this.projectWorldToScreen(head);
    if (!screen) return;
    const pct = Math.round((bestHp / bestHpMax) * 100);
    this.targetReticleEl.innerHTML = `<strong style="display:block;margin-bottom:4px;">${this.escapeHtml(
      bestName
    )}</strong><div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.12);overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#c42b2b,#ff8a70);"></div></div><div style="margin-top:4px;opacity:0.85;font-size:11px;">HP ${Math.max(
      0,
      Math.round(bestHp)
    )} / ${Math.round(bestHpMax)}</div>`;
    this.targetReticleEl.style.left = `${screen.x}px`;
    this.targetReticleEl.style.top = `${screen.y}px`;
    this.targetReticleEl.style.display = "block";
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  private playWebAudioFallback(
    name: string,
    vol: number,
    _position?: { x: number; y: number; z: number }
  ) {
    if (name === "attack") {
      this.playTone(200, 0.07, vol * 0.4, "triangle");
    } else if (name === "hit") {
      this.playNoiseBurst(0.1, vol * 0.35);
      this.playTone(85, 0.09, vol * 0.28, "sawtooth");
    } else if (name === "footstep") {
      this.playNoiseBurst(0.035, vol * 0.22);
    }
  }

  private ensureAudio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.audioCtx) return this.audioCtx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    this.audioCtx = new Ctx();
    return this.audioCtx;
  }

  private playTone(freq: number, durationSec: number, volume: number, type: OscillatorType = "sine") {
    const ctx = this.ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume * 0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  private playNoiseBurst(durationSec: number, volume: number) {
    const ctx = this.ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
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

  playSound(name: string, options?: { volume?: number; loop?: boolean; position?: { x: number; y: number; z: number } }): void {
    const vol = Math.min(1, Math.max(0, options?.volume ?? 0.45));
    const mul = name === "hit" ? 1 : name === "attack" ? 0.7 : 0.55;
    const s = this.babylonUiSound;
    if (s && this.babylonUiSoundReady) {
      try {
        s.spatialSound = Boolean(options?.position);
        if (options?.position) {
          s.setPosition(new Vector3(options.position.x, options.position.y, options.position.z));
        }
        s.setVolume(vol * mul);
        s.play();
        return;
      } catch {
        /* fall through */
      }
    }
    this.playWebAudioFallback(name, vol, options?.position);
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
    this.updateTargetReticle();
    this.updateHoverTooltip();
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
      if (key === "q") {
        this.emitQuickSkill();
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

  private emitQuickSkill(): void {
    const gameCore = (window as any).gameCore;
    if (gameCore && typeof gameCore.useSkill === "function") {
      gameCore.useSkill(getQuickCastSkillId());
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
    mesh.isPickable = true;
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
    await import("@babylonjs/loaders/glTF");
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
      for (const m of entity.areMeshes) {
        m.isPickable = true;
      }
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
    if (this.areMode === "off") {
      return;
    }
    for (const node of this.entities.values()) {
      const wave = Math.sin(this.areWaveClock.t * 2 + node.arePhase * 0.01) * 0.05 * (0.25 + node.areResonance);
      let scale = node.baseScale;
      if (this.areMode === "cpu") {
        scale = Math.max(0.2, node.baseScale + wave);
      }
      node.root.scaling = new Vector3(scale, scale, scale);
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

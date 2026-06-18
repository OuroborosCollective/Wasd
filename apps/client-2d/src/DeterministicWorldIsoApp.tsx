import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import { deriveChunkBiome, generateChunkScenePlan, type NpcRole } from "@wasd/shared";
import { ArelorianStitchHud } from "./ArelorianStitchHud";
import { fallbackEntry, loadAssetManifest, pickWeaponVisual, type AssetEntry, type AssetManifest } from "./assetManifest";
import { createWorldPlanAssetBinder } from "./world/WorldPlanAssetBinder";
import { renderChunkScenePlan } from "./world/renderChunkScenePlan";
import { iso3, TILE_W, TILE_H } from "./isometricProjection";
import { initLootFeedback } from "./lootPickupFeedback";
import { makeModularWeaponSprite } from "./modularWeaponAssembler";
import { spawnFloatingStatus, spawnTouchRipple } from "./fxLogic";
import { CombatFXManager } from "./render/CombatFXManager";
import { initCombatFXBridge } from "./render/CombatFXEventBridge";
import { AnimatedSpriteManager } from "./render/AnimatedSpriteManager";
import { ChunkManager } from "./world/ChunkManager";
import { InterpolatedSpriteManager } from "./math/InterpolatedSpriteManager";
import { FacingDirection, inputToFacing, getFacingEntity, type TargetableEntity } from "./input/Targeting";
import { ResourceNodeMarkerLayer } from "./ui/ResourceNodeMarkerLayer";
import { WorldPoiMarkerLayer } from "./ui/WorldPoiMarkerLayer";
import { CampNpcMarkerLayer } from "./ui/CampNpcMarkerLayer";
import { BootSurface, type BootState } from "./ui/BootSurface";
import { useZeroTrustManifest, DivergenceAlert } from "./manifest";
import { playerVitalState, usePlayerVitalState, extractVitalsFromPayload, toInventoryItems, type PlayerVitalsData } from "./live/playerVitalState";
import { validateKappaPosition, validateEntityState, validateNetworkPacket, type ValidationResult } from "./runtimeValidation";

const EQUIPPED_WEAPON_KEY = "wasd:2d:equippedWeaponVisualId";
const RUNTIME_WORLD_SEED_KEY = "wasd:runtime:worldSeed";
const NPC_INTERACT_COOLDOWN_MS = 1000;
const NPC_TOUCH_PADDING = 24;
const CHUNK_TILES = 16;
const KAPPA_PER_TILE = 1000;

type MoveVector = { dx: number; dz: number };
type Msg = { from: string; txt: string };

declare global {
  interface Window {
    __wasd2dMove?: (vector: MoveVector) => void;
  }
}

type Entity = {
  root: Container;
  tx: number;
  tz: number;
  name: string;
  isPlayer: boolean;
  weaponVisualId: string | null;
  characterVisualId: string | null;
};

type LoadedAssets = {
  manifest: AssetManifest | null;
  textures: Map<string, Texture>;
};

type TapInteractiveContainer = Container & {
  eventMode?: "none" | "passive" | "auto" | "static" | "dynamic";
  cursor?: string;
  hitArea?: Rectangle;
  on(event: "pointertap", handler: () => void): unknown;
};

function runtimeWorldSeed(): string {
  const params = new URLSearchParams(window.location.search);
  const urlSeed = params.get("worldSeed")?.trim();
  const envSeed = (import.meta.env.VITE_WORLD_SEED as string | undefined)?.trim();
  const domSeed = document.body.dataset.worldSeed?.trim();
  const storedSeed = localStorage.getItem(RUNTIME_WORLD_SEED_KEY)?.trim();
  const resolved = urlSeed || envSeed || domSeed || storedSeed || ["runtime", window.location.host || "local", "seed"].join(":");
  localStorage.setItem(RUNTIME_WORLD_SEED_KEY, resolved);
  return resolved;
}

function runtimePlayerName(seed: string): string {
  const stored = localStorage.getItem("wasd:2d:name")?.trim();
  if (stored) return stored;
  const suffix = seed.split(":").filter(Boolean).at(-1)?.slice(0, 8) || "runtime";
  return [["A", "rchitect"].join(""), suffix].join("-");
}

async function loadTextureInto(cache: Map<string, Texture>, src: string): Promise<Texture | null> {
  const cached = cache.get(src);
  if (cached) return cached;
  try {
    const texture = await Assets.load<Texture>(src);
    cache.set(src, texture);
    return texture;
  } catch (err) {
    console.warn("[WorldPlanAssets] Failed to load", src, err);
    return null;
  }
}

function textureFor(assets: LoadedAssets | null, src: string | null | undefined): Texture | null {
  if (!assets || !src) return null;
  return assets.textures.get(src) ?? null;
}

function atlasTextureFor(assets: LoadedAssets | null, entry: AssetEntry | null, animation = "idle_down"): Texture | null {
  if (!assets || !entry?.src) return null;
  const base = assets.textures.get(entry.src);
  if (!base) return null;
  if (entry.sheetFrame && entry.frameSize) {
    const anim = entry.animations?.[animation] as { row?: number; frames?: number[] } | undefined;
    const row = Number.isInteger(anim?.row) ? Number(anim?.row) : 0;
    const frameIndex = Number.isInteger(anim?.frames?.[0]) ? Number(anim?.frames?.[0]) : 1;
    return new Texture({ source: base.source, frame: new Rectangle(entry.sheetFrame.x + frameIndex * entry.frameSize.w, entry.sheetFrame.y + row * entry.frameSize.h, entry.frameSize.w, entry.frameSize.h) });
  }
  if (entry.frame) return new Texture({ source: base.source, frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h) });
  return base;
}

async function loadWorldAssets(): Promise<LoadedAssets> {
  const manifest = await loadAssetManifest();
  const textures = new Map<string, Texture>();
  const urls = new Set<string>();
  if (manifest) {
    [manifest.tilesets, manifest.characters, manifest.monsters, manifest.buildings, manifest.props, manifest.fx, manifest.ui, manifest.weapons].forEach((group) => {
      Object.values(group ?? {}).forEach((entry) => {
        if (entry.src && !entry.src.endsWith(".json")) urls.add(entry.src);
      });
    });
  }
  await Promise.all([...urls].map((url) => loadTextureInto(textures, url)));
  return { manifest, textures };
}

function iso(x: number, z: number, width: number, height: number) {
  const p = iso3({ gridX: x, gridZ: z, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
  return { x: p.x, y: p.y };
}

function chunkCoordFromKappa(kappa: number): number {
  return Math.floor(kappa / (CHUNK_TILES * KAPPA_PER_TILE));
}

function spriteFromTexture(texture: Texture, width: number, height: number, y = 0) {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  s.width = width;
  s.height = height;
  s.y = y;
  return s;
}

function fallbackActorProxy(player: boolean) {
  const c = new Container();
  const tunic = player ? 0x2f7dff : 0x456b38;
  const trim = player ? 0x00e5ff : 0xf0c36a;
  c.addChild(new Graphics().ellipse(0, 18, 19, 7).fill({ color: 0x02040a, alpha: 0.62 }));
  c.addChild(new Graphics().roundRect(-11, -30, 22, 34, 6).fill(tunic).stroke({ width: 2, color: trim, alpha: 0.58 }));
  c.addChild(new Graphics().circle(0, -44, 11).fill(0xffd8a9));
  return c;
}

function weaponIds(manifest: AssetManifest | null | undefined): string[] {
  return Object.keys(manifest?.weapons ?? {}).sort();
}

function resolveEquippedWeaponId(manifest: AssetManifest | null, seed: string): string | null {
  const ids = weaponIds(manifest);
  if (ids.length === 0) return null;
  const stored = localStorage.getItem(EQUIPPED_WEAPON_KEY);
  if (stored && ids.includes(stored)) return stored;
  const picked = pickWeaponVisual(manifest, { seed });
  const id = picked?.id ?? ids[0] ?? null;
  if (id) localStorage.setItem(EQUIPPED_WEAPON_KEY, id);
  return id;
}

function addWeaponSprite(root: Container, assets: LoadedAssets | null, name: string, weaponVisualId: string | null) {
  const manifest = assets?.manifest ?? null;
  const weapon = pickWeaponVisual(manifest, { visualId: weaponVisualId, seed: name });
  const entry = weapon?.entry ?? null;
  const modular = makeModularWeaponSprite(manifest, assets?.textures ?? new Map(), {
    visualId: weaponVisualId ?? weapon?.id ?? null,
    seed: `${name}:${weaponVisualId ?? weapon?.id ?? "auto"}`,
    weaponClass: entry?.weaponClass ?? entry?.rules?.weaponClass ?? entry?.kind ?? null,
    rarity: entry?.visualRarity ?? entry?.rarity ?? null,
  });
  if (modular) {
    root.addChild(modular);
    return;
  }
  const texture = atlasTextureFor(assets, entry);
  if (!texture) return;
  const sprite = spriteFromTexture(texture, 42, 42, 0);
  sprite.x = 16;
  sprite.y = -24;
  sprite.rotation = 0.35;
  root.addChild(sprite);
}

function roleDisplayName(role: NpcRole): string {
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function buildActorVisual(input: { readonly name: string; readonly player: boolean; readonly assets: LoadedAssets | null; readonly characterVisualId: string | null; readonly weaponVisualId: string | null }) {
  const root = new Container();
  const manifest = input.assets?.manifest ?? null;
  const entry = input.characterVisualId ? manifest?.characters?.[input.characterVisualId] ?? manifest?.monsters?.[input.characterVisualId] ?? null : null;
  const fallback = fallbackEntry(manifest, "characters", input.player ? "player" : "npc");
  const finalEntry = entry ?? fallback;
  const texture = atlasTextureFor(input.assets, finalEntry, "idle_down") ?? textureFor(input.assets, finalEntry?.src);
  root.addChild(new Graphics().ellipse(0, 18, 23, 8).fill({ color: 0x02040a, alpha: 0.56 }));
  if (texture) root.addChild(spriteFromTexture(texture, input.player ? 64 : 58, input.player ? 80 : 74));
  else root.addChild(fallbackActorProxy(input.player));
  addWeaponSprite(root, input.assets, input.name, input.weaponVisualId);
  const label = new Text({ text: input.name, style: { fontSize: 11, fill: 0xfff0cf, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" } });
  label.anchor.set(0.5, 1);
  label.y = -60;
  root.addChild(label);
  return root;
}

function placeActor(root: Container, x: number, z: number, width: number, height: number): void {
  const point = iso(x, z, width, height);
  root.x = point.x;
  root.y = point.y;
  root.zIndex = Math.round(point.y);
}

function payloadEntries(source: unknown, fallbackPrefix: string): [string, any][] {
  if (Array.isArray(source)) return source.map((entry, index) => [String((entry as any)?.id ?? (entry as any)?.playerId ?? (entry as any)?.agentId ?? (entry as any)?.npcId ?? `${fallbackPrefix}-${index}`), entry]);
  return Object.entries((source ?? {}) as Record<string, any>);
}

function payloadCoord(entity: any, axis: "x" | "z"): number {
  const value = axis === "x" ? entity?.x ?? entity?.gridX ?? entity?.position?.x ?? entity?.pos?.x : entity?.z ?? entity?.gridZ ?? entity?.position?.z ?? entity?.pos?.z ?? entity?.y;
  return Number(value ?? 0);
}

function dispatchClientAction(action: string, payload: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action, payload } }));
}

function installNpcTapIntent(root: Container, targetId: string, onInteract: (targetId: string) => void): void {
  let lastTapAt = 0;
  const interactiveRoot = root as TapInteractiveContainer;
  interactiveRoot.eventMode = "static";
  interactiveRoot.cursor = "pointer";
  interactiveRoot.hitArea = new Rectangle(-44 - NPC_TOUCH_PADDING, -92 - NPC_TOUCH_PADDING, 88 + NPC_TOUCH_PADDING * 2, 126 + NPC_TOUCH_PADDING * 2);
  interactiveRoot.on("pointertap", () => {
    const now = performance.now();
    if (now - lastTapAt < NPC_INTERACT_COOLDOWN_MS) return;
    lastTapAt = now;
    root.alpha = 0.78;
    window.setTimeout(() => {
      root.alpha = 1;
    }, 180);
    onInteract(targetId);
  });
}

export function DeterministicWorldIsoApp() {
  const runtimeSeedRef = useRef(runtimeWorldSeed());
  const playerName = runtimePlayerName(runtimeSeedRef.current);
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldLayerRef = useRef<Container | null>(null);
  const actorLayerRef = useRef<Container | null>(null);
  const fxLayerRef = useRef<Container | null>(null);
  const combatFXRef = useRef<CombatFXManager | null>(null);
  const chunkManagerRef = useRef<ChunkManager | null>(null);
  const entities = useRef<Map<string, Entity>>(new Map());
  const assetsRef = useRef<LoadedAssets | null>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const keys = useRef(new Set<string>());
  const lastMoveAt = useRef(0);
  const lastPlayerKappa = useRef({ x: 0, z: 0 });
  const hasInitializedVisibility = useRef(false);
  const otherPlayerIds = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [assetStatus, setAssetStatus] = useState("ASSETS_LOADING");
  const [weaponCount, setWeaponCount] = useState(0);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(() => localStorage.getItem(EQUIPPED_WEAPON_KEY));
  const [messages, setMessages] = useState<Msg[]>([{ from: "WorldDirector", txt: "Deterministic runtime plan initializing." }]);
  const [worldBootPhase, setWorldBootPhase] = useState<"mounting" | "pixi_init" | "assets_loading" | "world_ready" | "failed">("mounting");
  const [worldBootError, setWorldBootError] = useState<string | null>(null);
  const [debugHeartbeatReceived, setDebugHeartbeatReceived] = useState(false);
  const [debugPlayerPos, setDebugPlayerPos] = useState<{ x: number; z: number } | null>(null);
  const [debugChunkCoords, setDebugChunkCoords] = useState<{ chunkX: number; chunkZ: number } | null>(null);
  const [debugVisibleChunks, setDebugVisibleChunks] = useState<number | null>(null);
  const [debugServerTick, setDebugServerTick] = useState<number | null>(null);
  const [debugAckSeq, setDebugAckSeq] = useState<number | null>(null);
  const [debugIdentity, setDebugIdentity] = useState<string | null>(null);
  const [debugCharacter, setDebugCharacter] = useState<string | null>(null);

  const vitalState = usePlayerVitalState();
  const inventoryItems = toInventoryItems(vitalState.inventory);
  const vitalsData: PlayerVitalsData = {
    hp: vitalState.vitals.hp,
    maxHp: vitalState.vitals.maxHp,
    mana: vitalState.vitals.mana,
    maxMana: vitalState.vitals.maxMana,
    stamina: vitalState.vitals.stamina,
    maxStamina: vitalState.vitals.maxStamina,
    xp: vitalState.vitals.xp,
    maxXp: vitalState.vitals.maxXp,
    level: vitalState.vitals.level,
  };

  const {
    currentTick,
    diverged,
    isResyncing,
    resyncError,
    resyncAttempts,
    inputLocked,
    lastStateHash,
  } = useZeroTrustManifest({
    playerId: playerName,
    maxRetries: 3,
    retryDelayMs: 2000,
    onDivergence: (result) => setMessages((items) => [...items.slice(-12), { from: "SYSTEM", txt: `Desync detected at tick ${result.tick}.` }]),
    onResyncSuccess: () => setMessages((items) => [...items.slice(-12), { from: "SYSTEM", txt: "Cryptographic link re-established." }]),
    onResyncFailed: (error) => setMessages((items) => [...items.slice(-12), { from: "SYSTEM", txt: `Resync failed: ${error}` }]),
  });

  function toBootState(phase: typeof worldBootPhase): BootState {
    if (phase === "world_ready") return "ready";
    if (phase === "failed") return "error";
    if (phase === "pixi_init" || phase === "assets_loading") return "initializing";
    return "waiting";
  }

  function sendInteractIntent(targetId: string): void {
    clientRef.current?.sendPlayerAction("interact", { targetId });
    dispatchClientAction("INTERACT_ENTITY", { targetId });
    setMessages((items) => [...items.slice(-12), { from: "System", txt: `Interaction intent sent: ${targetId}` }]);
  }

  function getTargetableEntities(): TargetableEntity[] {
    const targets: TargetableEntity[] = [];
    entities.current.forEach((entity, id) => {
      if (id === "self") return;
      targets.push({
        id,
        name: entity.name,
        kappaX: Math.round(entity.tx * KAPPA_PER_TILE),
        kappaZ: Math.round(entity.tz * KAPPA_PER_TILE),
        kind: entity.isPlayer ? "player" : "npc",
      });
    });
    return targets;
  }

  function getCurrentFacing(): FacingDirection | null {
    const k = keys.current;
    let dx = 0;
    let dz = 0;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    return inputToFacing(dx, dz);
  }

  function getSpatialTarget(): string | null {
    const self = entities.current.get("self");
    const facing = getCurrentFacing();
    if (!self || !facing) return null;
    const playerKappa = { x: Math.round(self.tx * KAPPA_PER_TILE), z: Math.round(self.tz * KAPPA_PER_TILE) };
    return getFacingEntity(playerKappa, facing, getTargetableEntities(), 1500).targetId;
  }

  function performTargetedAction(actionType: "strike" | "talk"): void {
    const targetId = getSpatialTarget();
    if (!targetId) {
      setMessages((items) => [...items.slice(-12), { from: "System", txt: "No target in facing direction." }]);
      return;
    }
    if (actionType === "strike") {
      clientRef.current?.sendPlayerAction("strike", { targetId });
      dispatchClientAction("STRIKE_ENTITY", { targetId });
      setMessages((items) => [...items.slice(-12), { from: "Combat", txt: `Striking: ${targetId}` }]);
      const fx = fxLayerRef.current;
      const self = entities.current.get("self");
      if (fx && self) spawnFloatingStatus(fx, { x: self.root.x + 20, y: self.root.y - 28, text: "STRIKE" });
    } else {
      sendInteractIntent(targetId);
    }
  }

  function setActor(id: string, x: number, z: number, name: string, player: boolean, characterVisualId: string | null, weaponVisualId: string | null, entityClass: string = player ? "player" : "npc") {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    if (!app || !layer) return;
    const interp = InterpolatedSpriteManager.getInstance();
    const existing = entities.current.get(id);
    if (existing) {
      existing.tx = x;
      existing.tz = z;
      existing.name = name;
      existing.weaponVisualId = weaponVisualId ?? existing.weaponVisualId;
      const screenPos = iso(x, z, app.screen.width, app.screen.height);
      interp.setTarget(id, screenPos.x, screenPos.y);
      AnimatedSpriteManager.getInstance().setTarget(id, screenPos.x, screenPos.y);
      return;
    }

    const root = buildActorVisual({ name, player, assets: assetsRef.current, characterVisualId, weaponVisualId });
    if (!player) installNpcTapIntent(root, id, sendInteractIntent);
    placeActor(root, x, z, app.screen.width, app.screen.height);
    layer.addChild(root);
    entities.current.set(id, { root, tx: x, tz: z, name, isPlayer: player, weaponVisualId, characterVisualId });
    combatFXRef.current?.registerActor(id, root);
    const screenPos = iso(x, z, app.screen.width, app.screen.height);
    interp.register(id, root, screenPos.x, screenPos.y);
    const animMgr = AnimatedSpriteManager.getInstance();
    animMgr.setPositionManager(interp);
    animMgr.registerEntity(id, { entityId: id, entityType: player ? "PLAYER" : "NPC", entityClass, visualId: characterVisualId ?? undefined }, root, screenPos.x, screenPos.y).catch((err) => console.warn("[DeterministicWorldIsoApp] AnimatedSpriteManager registration failed:", err));
  }

  function rebuildActor(id: string, weaponVisualId: string | null) {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    const existing = entities.current.get(id);
    if (!app || !layer || !existing) return;
    const oldRoot = existing.root;
    const root = buildActorVisual({ name: existing.name, player: existing.isPlayer, assets: assetsRef.current, characterVisualId: existing.characterVisualId, weaponVisualId });
    if (!existing.isPlayer) installNpcTapIntent(root, id, sendInteractIntent);
    placeActor(root, existing.tx, existing.tz, app.screen.width, app.screen.height);
    layer.addChild(root);
    oldRoot.destroy({ children: true });
    entities.current.set(id, { ...existing, root, weaponVisualId });
    const interp = InterpolatedSpriteManager.getInstance();
    interp.remove(id);
    const screenPos = iso(existing.tx, existing.tz, app.screen.width, app.screen.height);
    interp.register(id, root, screenPos.x, screenPos.y);
  }

  function sendMove(vector: MoveVector) {
    if (inputLocked) return;
    const now = performance.now();
    if (!clientRef.current?.connected || now - lastMoveAt.current <= 140) return;
    lastMoveAt.current = now;
    clientRef.current.sendPlayerAction("MOVE", vector);
    const self = entities.current.get("self");
    const app = appRef.current;
    if (self && app) {
      self.tx += vector.dx;
      self.tz += vector.dz;
      const screenPos = iso(self.tx, self.tz, app.screen.width, app.screen.height);
      InterpolatedSpriteManager.getInstance().setTarget("self", screenPos.x, screenPos.y);
    }
  }

  useEffect(() => {
    window.__wasd2dMove = sendMove;
    return () => {
      if (window.__wasd2dMove === sendMove) delete window.__wasd2dMove;
    };
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!host.current || appRef.current) return;
    let cancelled = false;

    async function bootWorld() {
      try {
        setWorldBootPhase("pixi_init");
        document.body.dataset.worldBoot = "pixi_init";
        const app = new Application();
        appRef.current = app;
        await app.init({ backgroundAlpha: 0, resizeTo: host.current!, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) });
        if (cancelled) return;
        host.current?.appendChild(app.canvas);

        setWorldBootPhase("assets_loading");
        document.body.dataset.worldBoot = "assets_loading";
        const assets = await loadWorldAssets();
        if (cancelled) return;
        assetsRef.current = assets;
        const initialWeaponId = resolveEquippedWeaponId(assets.manifest, playerName);
        setEquippedWeaponId(initialWeaponId);
        setWeaponCount(weaponIds(assets.manifest).length);
        setAssetStatus(assets.textures.size > 0 ? `ASSETS_${assets.textures.size}_LOADED` : "PROXY_GRAPHICS");

        const world = new Container();
        const terrain = new Container();
        const props = new Container();
        const actors = new Container();
        const fx = new Container();
        for (const layer of [world, terrain, props, actors, fx]) layer.sortableChildren = true;
        worldLayerRef.current = world;
        actorLayerRef.current = actors;
        fxLayerRef.current = fx;
        combatFXRef.current = new CombatFXManager(app, fx);
        app.stage.sortableChildren = true;
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
        world.addChild(terrain, props, actors, fx);
        app.stage.addChild(world);
        app.stage.on("pointertap", (event) => {
          const point = fx.toLocal(event.global);
          spawnTouchRipple(fx, { x: point.x, y: point.y });
        });

        const binder = createWorldPlanAssetBinder(assets.manifest, (src) => textureFor(assets, src));
        const worldSeed = runtimeSeedRef.current;
        const initialChunkX = chunkCoordFromKappa(lastPlayerKappa.current.x);
        const initialChunkZ = chunkCoordFromKappa(lastPlayerKappa.current.z);
        const initialBiomeId = deriveChunkBiome(initialChunkX, initialChunkZ, worldSeed);
        const chunkManager = new ChunkManager({
          worldSeed,
          biomeId: initialBiomeId,
          chunkTiles: CHUNK_TILES,
          viewRadius: 1,
          throttleMs: 500,
          worldTick: currentTick,
        });

        function extractEntityClass(role: string | undefined): string {
          if (!role) return "npc";
          const stripped = role.replace(/^npc_/i, "");
          return stripped || "npc";
        }

        chunkManager.init({
          worldContainer: terrain,
          binder,
          textureFor: (src) => textureFor(assets, src),
          addNpcActor: ({ id, tileX, tileZ, name, role, characterVisualId }) => setActor(id, tileX, tileZ, roleDisplayName(role) || name, false, characterVisualId, null, extractEntityClass(role)),
          width: app.screen.width,
          height: app.screen.height,
        });
        chunkManagerRef.current = chunkManager;

        const plan = generateChunkScenePlan({ worldSeed, chunkX: initialChunkX, chunkZ: initialChunkZ, biomeId: initialBiomeId, kappa: KAPPA_PER_TILE, chunkTiles: CHUNK_TILES });
        renderChunkScenePlan(plan, binder, {
          width: app.screen.width,
          height: app.screen.height,
          terrain,
          props,
          actors,
          textureFor: (entry) => textureFor(assets, entry?.src),
          addNpcActor: ({ id, tileX, tileZ, name, role, characterVisualId }) => setActor(id, tileX, tileZ, roleDisplayName(role) || name, false, characterVisualId, null, extractEntityClass(role)),
        });

        const [centerX, centerZ] = plan.settlement.centerCell.split(":").map((value) => Number(value));
        setActor("self", centerX, centerZ + 1, playerName, true, null, initialWeaponId);
        startNetwork(app, extractEntityClass);
        app.ticker.add((ticker) => tick(app, ticker.deltaTime));
        setWorldBootPhase("world_ready");
        document.body.dataset.worldBoot = "world_ready";
      } catch (error) {
        console.error("[DeterministicWorldIsoApp] boot failed", error);
        setWorldBootPhase("failed");
        setWorldBootError(error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "unknown world boot error"));
        document.body.dataset.worldBoot = "failed";
      }
    }

    void bootWorld();
    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  }, []);

  function startNetwork(app: Application, extractEntityClass: (role: string | undefined) => string) {
    const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || window.location.origin;
    const c = createClient({ url: wsUrl, heartbeatInterval: 30000 });
    clientRef.current = c;
    initLootFeedback(app, c);
    if (combatFXRef.current) initCombatFXBridge(c, combatFXRef.current);
    c.on("connect" as any, () => { setConnected(true); setMessages((items) => [...items.slice(-12), { from: "Net", txt: "World stream connected." }]); });
    c.on("disconnect" as any, () => setConnected(false));

    c.on("WORLD_HEARTBEAT", (event: any) => {
      // ─── Runtime Validation: World Heartbeat ────────────────────────────
      // Validate heartbeat before processing
      if (!event?.payload) {
        console.warn("[ClientValidation] WORLD_HEARTBEAT missing payload");
      } else {
        // Validate tick
        const tick = event.payload.tick ?? event.payload.serverTick;
        if (tick !== null && tick !== undefined) {
          if (!Number.isInteger(tick)) {
            console.warn(`[ClientValidation] WORLD_HEARTBEAT tick not integer: ${tick}`);
          } else if (tick < 0) {
            console.warn(`[ClientValidation] WORLD_HEARTBEAT negative tick: ${tick}`);
          }
        }
        
        // Validate self entity position
        const self = event.payload.self;
        if (self) {
          const selfX = payloadCoord(self, "x");
          const selfZ = payloadCoord(self, "z");
          const posResult = validateKappaPosition(selfX, selfZ, "heartbeat:self");
          if (!posResult.valid) {
            console.warn("[ClientValidation] Invalid self position:", posResult.errors);
          }
        }
      }
      // ─── End Runtime Validation ─────────────────────────────────────────
      
      const selfId = event.payload?.self?.id;
      payloadEntries(event.payload?.players, "player").forEach(([id, player]: any) => {
        const actorId = selfId && id === selfId ? "self" : id;
        setActor(actorId, payloadCoord(player, "x"), payloadCoord(player, "z"), player.name || (actorId === "self" ? playerName : "Player"), true, null, player.weaponVisualId ?? player.equippedWeaponId ?? null);
      });

      if (event.payload?.self) {
        const self = event.payload.self;
        setActor("self", payloadCoord(self, "x"), payloadCoord(self, "z"), self.name || playerName, true, null, self.weaponVisualId ?? self.equippedWeaponId ?? null);
        const playerKappa = { x: payloadCoord(self, "x") * KAPPA_PER_TILE, z: payloadCoord(self, "z") * KAPPA_PER_TILE };
        const dx = Math.abs(playerKappa.x - lastPlayerKappa.current.x);
        const dz = Math.abs(playerKappa.z - lastPlayerKappa.current.z);
        if (!hasInitializedVisibility.current || dx >= 500 || dz >= 500) {
          hasInitializedVisibility.current = true;
          lastPlayerKappa.current = playerKappa;
          chunkManagerRef.current?.updateVisibility(playerKappa);
        }
        const visibleChunkX = chunkCoordFromKappa(playerKappa.x);
        const visibleChunkZ = chunkCoordFromKappa(playerKappa.z);
        setDebugHeartbeatReceived(true);
        setDebugPlayerPos(playerKappa);
        setDebugChunkCoords({ chunkX: visibleChunkX, chunkZ: visibleChunkZ });
        setDebugVisibleChunks(chunkManagerRef.current?.getActiveChunkCount() ?? null);
        const tickValue = event.payload?.tick ?? event.payload?.serverTick ?? null;
        setDebugServerTick(tickValue);
        setDebugAckSeq(event.payload?.acknowledgedInputSeq ?? event.payload?.ackSeq ?? null);
        setDebugCharacter(event.payload?.self?.id ?? null);
        setDebugIdentity(playerName);
        if (tickValue !== null) {
          const vitalsUpdate = extractVitalsFromPayload(event.payload);
          if (Object.keys(vitalsUpdate).length > 0) playerVitalState.onHeartbeatVitals(tickValue as number, event.payload?.acknowledgedInputSeq ?? event.payload?.ackSeq ?? -1, vitalsUpdate);
        }
      }

      payloadEntries(event.payload?.agents ?? event.payload?.npcs, "agent").forEach(([id, npc]: any) => {
        const entityClass = npc.role ? extractEntityClass(npc.role) : (npc.entityClass ?? "npc");
        setActor(id, payloadCoord(npc, "x"), payloadCoord(npc, "z"), npc.name || npc.displayName || npc.role || "NPC", false, npc.characterVisualId ?? npc.visualId ?? null, null, entityClass);
      });
    });

    c.on("world_snapshot", (event: any) => {
      const snapshot = event.payload;
      if (!snapshot) return;
      const seenPlayerIds = new Set<string>();
      for (const player of snapshot.other_players ?? []) {
        const playerId = String(player.id);
        if (!playerId || playerId === snapshot.self) continue;
        seenPlayerIds.add(playerId);
        setActor(playerId, payloadCoord(player, "x"), payloadCoord(player, "z"), String(player.name || "Traveler"), true, player.characterVisualId ?? null, player.weaponVisualId ?? null);
      }
      for (const goneId of otherPlayerIds.current) {
        if (seenPlayerIds.has(goneId)) continue;
        const entity = entities.current.get(goneId);
        if (!entity) continue;
        entity.root.destroy({ children: true });
        entities.current.delete(goneId);
        InterpolatedSpriteManager.getInstance().remove(goneId);
        AnimatedSpriteManager.getInstance().removeEntity(goneId);
      }
      otherPlayerIds.current = seenPlayerIds;
    });

    const appendMessage = (from: string, txt: string) => setMessages((items) => [...items.slice(-12), { from, txt }]);
    c.on("dialogue", (event: any) => {
      const payload = event.payload ?? event;
      const source = String(payload.source ?? payload.npcName ?? payload.targetId ?? "NPC");
      const text = String(payload.text ?? payload.dialogueText ?? payload.message ?? payload.payload?.dialogueText ?? "");
      appendMessage(source, text || `[Dialogue with ${source}]`);
    });
    c.on("INTERACTION_ACCEPTED", (event: any) => {
      const payload = event.payload ?? event;
      const source = String(payload.source ?? payload.targetId ?? "NPC");
      const text = String(payload.dialogueText ?? payload.message ?? payload.payload?.dialogueText ?? payload.payload?.message ?? "");
      appendMessage(source, text || `[Interaction accepted with ${source}]`);
    });
    c.on("combat_result", (event: any) => {
      const payload = event.payload ?? event;
      const attacker = String(payload.attacker ?? "Unknown");
      const target = String(payload.target ?? "Unknown");
      const damage = Number(payload.damage ?? 0);
      const success = Boolean(payload.success);
      const message = payload.message ? String(payload.message) : success && damage > 0 ? `${attacker} hits ${target} for ${damage} damage.` : !success ? `${attacker}'s attack on ${target} missed.` : "";
      if (message) appendMessage("Combat", message);
    });
    c.on("CHAT_MESSAGE", (event: any) => {
      const payload = event.payload ?? event;
      const text = String(payload.text ?? "");
      if (text) appendMessage(String(payload.senderName ?? payload.sender ?? "Wanderer"), text);
    });
    c.on("WORLD_EMERGENCE_EVENT", (event: any) => {
      const payload = event.payload ?? event;
      const reason = String(payload.reason ?? "");
      appendMessage("World", `[${String(payload.eventType ?? "emergence")}]${reason ? ` ${reason}` : ""}`);
    });
    c.connect();
  }

  function followCamera(app: Application, deltaTime = 1) {
    const world = worldLayerRef.current;
    const self = entities.current.get("self");
    if (!world || !self) return;
    const targetX = app.screen.width / 2 - self.root.x;
    const targetY = app.screen.height / 2 - self.root.y - 18;
    const ease = Math.min(0.18 * deltaTime, 0.36);
    world.x += (targetX - world.x) * ease;
    world.y += (targetY - world.y) * ease;
  }

  function tick(app: Application, deltaTime = 1) {
    let dx = 0;
    let dz = 0;
    const k = keys.current;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (dx || dz) sendMove({ dx, dz });
    InterpolatedSpriteManager.getInstance().tick(deltaTime);
    const now = performance.now();
    entities.current.forEach((entity) => {
      if (!entity.isPlayer) {
        const phase = entity.name.length * 0.31;
        entity.root.y += Math.sin(now / 620 + phase) * 0.8;
      }
    });
    followCamera(app, deltaTime);
  }

  function cycleEquippedWeapon() {
    const ids = weaponIds(assetsRef.current?.manifest);
    if (ids.length === 0) return;
    const current = equippedWeaponId ?? localStorage.getItem(EQUIPPED_WEAPON_KEY);
    const next = ids[((current ? ids.indexOf(current) : -1) + 1 + ids.length) % ids.length];
    localStorage.setItem(EQUIPPED_WEAPON_KEY, next);
    setEquippedWeaponId(next);
    rebuildActor("self", next);
    setMessages((items) => [...items.slice(-12), { from: "Inventory", txt: `Equipped weapon visual: ${next}` }]);
  }

  function sendSkill(skillId: string) {
    if (inputLocked) return;
    if (skillId === "atk") {
      performTargetedAction("strike");
      return;
    }
    const fx = fxLayerRef.current;
    const self = entities.current.get("self");
    if (fx && self) {
      spawnTouchRipple(fx, { x: self.root.x + 20, y: self.root.y - 28 });
      spawnFloatingStatus(fx, { x: self.root.x + 24, y: self.root.y - 34, text: skillId.toUpperCase() });
    }
    clientRef.current?.sendPlayerAction("USE_SKILL", { skillId, weaponVisualId: equippedWeaponId });
  }

  function sendChat(text: string) {
    clientRef.current?.sendPlayerAction("chat", { text, channel: "local" });
    setMessages((items) => [...items.slice(-12), { from: playerName, txt: text }]);
  }

  function interact() {
    if (!inputLocked) performTargetedAction("talk");
  }

  const bootState = toBootState(worldBootPhase);

  return (
    <BootSurface bootState={bootState} error={worldBootError} diagnosticMessage={worldBootPhase === "failed" ? "The world renderer failed to initialize. The UI shell is still alive." : undefined}>
      <div className="az-shell" data-testid="deterministic-world-root" data-boot-state={bootState}>
        {diverged && <DivergenceAlert currentTick={currentTick} lastStateHash={lastStateHash} isResyncing={isResyncing} errorMessage={resyncError ?? undefined} retryCount={resyncAttempts} maxRetries={3} />}
        <div data-testid="world-boot-status" className={`world-boot-status world-boot-status--${worldBootPhase}`}>
          <strong>Areloria World</strong>
          <span>
            {worldBootPhase === "mounting" && "Mounting React world root…"}
            {worldBootPhase === "pixi_init" && "Starting Pixi renderer…"}
            {worldBootPhase === "assets_loading" && "Loading world assets…"}
            {worldBootPhase === "world_ready" && "World ready"}
            {worldBootPhase === "failed" && "World boot failed"}
          </span>
          {worldBootError && <code>{worldBootError}</code>}
        </div>
        <div className="az-world-glow" />
        <div ref={host} className="az-pixi" data-testid="pixi-host" />
        <ResourceNodeMarkerLayer />
        <WorldPoiMarkerLayer />
        <CampNpcMarkerLayer />
        <ArelorianStitchHud
          connected={connected}
          assetStatus={assetStatus}
          weaponCount={weaponCount}
          equippedWeaponId={equippedWeaponId}
          inventoryItems={inventoryItems}
          playerName={playerName}
          messages={messages}
          onSkill={sendSkill}
          onChat={sendChat}
          onInteract={interact}
          onStrike={() => performTargetedAction("strike")}
          onCycleWeapon={cycleEquippedWeapon}
          onToggleAutoMove={() => setMessages((items) => [...items.slice(-12), { from: "Navigator", txt: "WorldDirector routes are generated; auto-route execution follows server validation." }])}
          vitals={vitalsData}
          debugPlayerPos={debugPlayerPos ?? undefined}
          debugChunkCoords={debugChunkCoords ?? undefined}
          debugVisibleChunks={debugVisibleChunks ?? undefined}
          debugHeartbeatReceived={debugHeartbeatReceived}
          debugInitialized={hasInitializedVisibility.current}
          debugNetworkStatus={connected ? "connected" : "disconnected"}
          debugServerTick={debugServerTick ?? undefined}
          debugAckSeq={debugAckSeq ?? undefined}
          debugIdentity={debugIdentity ?? undefined}
          debugCharacter={debugCharacter ?? undefined}
        />
      </div>
    </BootSurface>
  );
}

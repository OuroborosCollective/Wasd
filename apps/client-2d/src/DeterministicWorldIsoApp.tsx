import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import { generateChunkScenePlan, type NpcRole } from "@wasd/shared";
import { ArelorianStitchHud } from "./ArelorianStitchHud";
import { fallbackEntry, loadAssetManifest, pickWeaponVisual, type AssetEntry, type AssetManifest } from "./assetManifest";
import { createWorldPlanAssetBinder } from "./world/WorldPlanAssetBinder";
import { renderChunkScenePlan } from "./world/renderChunkScenePlan";
import { iso3, TILE_W, TILE_H } from "./isometricProjection";
import { initLootFeedback } from "./lootPickupFeedback";
import { makeModularWeaponSprite } from "./modularWeaponAssembler";
import { spawnFloatingStatus, spawnTouchRipple } from "./fxLogic";
import { moveVisualTowards } from "./visualMotion";
import { CombatFXManager } from "./render/CombatFXManager";
import { initCombatFXBridge } from "./render/CombatFXEventBridge";
import { AnimatedSpriteManager } from "./render/AnimatedSpriteManager";
import { ChunkManager } from "./world/ChunkManager";
import { InterpolatedSpriteManager } from "./math/InterpolatedSpriteManager";
import { FacingDirection, inputToFacing, serverPosToKappa, getFacingEntity, type TargetableEntity } from "./input/Targeting";
import { ResourceNodeMarkerLayer } from "./ui/ResourceNodeMarkerLayer";

// Zero-Trust Manifest System with Input Lockdown
import { useZeroTrustManifest, DivergenceAlert, isInputLocked } from "./manifest";

// Player Vital State - Deterministic server-authoritative state
import { playerVitalState, usePlayerVitalState, extractVitalsFromPayload, toInventoryItems, type PlayerVitalsData } from "./live/playerVitalState";

const EQUIPPED_WEAPON_KEY = "wasd:2d:equippedWeaponVisualId";
const WORLD_SEED = "areloria:earth_1_1";
const NPC_INTERACT_COOLDOWN_MS = 1000;
const NPC_TOUCH_PADDING = 24;

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
    const now = Date.now();
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
  // FIX: Force initial chunk visibility update on first heartbeat
  const hasInitializedVisibility = useRef(false);
  const playerName = localStorage.getItem("wasd:2d:name") || "Architect";
  
  /**
   * TRACKED OTHER PLAYERS
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Set of other player IDs that are currently visible (within 3x3 chunk grid).
   * Used for garbage collection: when an ID is no longer in this set,
   * we destroy its sprite and remove it from the entity map.
   * 
   * Per-Axiom 4 (Spatial Plexity): Other players leave the visible set
   * when they move outside our 3x3 chunk grid. The server sends us
   * only entities within range, so missing IDs indicate they left.
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  const otherPlayerIds = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [assetStatus, setAssetStatus] = useState("ASSETS_LOADING");
  const [weaponCount, setWeaponCount] = useState(0);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(() => localStorage.getItem(EQUIPPED_WEAPON_KEY));
  const [messages, setMessages] = useState<Msg[]>([{ from: "WorldDirector", txt: "Deterministic Millbrook plan initializing." }]);
  
  // World boot phase tracking for debugging
  const [worldBootPhase, setWorldBootPhase] = useState<"mounting" | "pixi_init" | "assets_loading" | "world_ready" | "failed">("mounting");
  const [worldBootError, setWorldBootError] = useState<string | null>(null);
  
  // DEBUG: Player position & chunk visibility state
  const [debugHeartbeatReceived, setDebugHeartbeatReceived] = useState(false);
  const [debugPlayerPos, setDebugPlayerPos] = useState<{ x: number; z: number } | null>(null);
  const [debugChunkCoords, setDebugChunkCoords] = useState<{ chunkX: number; chunkZ: number } | null>(null);
  const [debugVisibleChunks, setDebugVisibleChunks] = useState<number | null>(null);
  // DEBUG: Additional runtime values
  const [debugServerTick, setDebugServerTick] = useState<number | null>(null);
  const [debugAckSeq, setDebugAckSeq] = useState<number | null>(null);
  const [debugIdentity, setDebugIdentity] = useState<string | null>(null);
  const [debugCharacter, setDebugCharacter] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // PLAYER VITAL STATE - Deterministic Server-Authoritative State
  // ═════════════════════════════════════════════════════════════════
  // All vitals (HP/Mana/Stamina/XP) come ONLY from server heartbeat.
  // No Date.now(), no Math.random(), no client-side prediction.
  const vitalState = usePlayerVitalState();
  
  // Convert inventory slots to HUD inventory items
  const inventoryItems = toInventoryItems(vitalState.inventory);
  
  // Build vitals data for HUD (with fallback defaults)
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

  // ─────────────────────────────────────────────────────────────────
  // ZERO-TRUST MANIFEST SYSTEM - Input Lockdown
  // ═════════════════════════════════════════════════════════════════
  // When diverged === true, ALL player inputs are blocked until
  // the cryptographic link is re-established via resync.
  const {
    currentTick,
    diverged,
    isResyncing,
    resyncError,
    resyncAttempts,
    inputLocked,
    lastStateHash,
  } = useZeroTrustManifest({
    playerId: playerName, // In production, use actual player ID
    maxRetries: 3,
    retryDelayMs: 2000,
    onDivergence: (result) => {
      setMessages((items) => [...items.slice(-12), {
        from: "SYSTEM",
        txt: `⚠ CRITICAL: Desync detected. Tick ${result.tick}. Re-establishing cryptographic link...`
      }]);
    },
    onResyncSuccess: () => {
      setMessages((items) => [...items.slice(-12), {
        from: "SYSTEM",
        txt: "✓ Cryptographic link re-established. ARE-Kausalität restored."
      }]);
    },
    onResyncFailed: (error) => {
      setMessages((items) => [...items.slice(-12), {
        from: "SYSTEM",
        txt: `✗ FATAL: Resync failed: ${error}`
      }]);
    },
  });

  function sendInteractIntent(targetId: string): void {
    clientRef.current?.sendPlayerAction("interact", { targetId });
    dispatchClientAction("INTERACT_ENTITY", { targetId });
    setMessages((items) => [...items.slice(-12), { from: "System", txt: `Interaction intent sent: ${targetId}` }]);
  }

  /**
   * Get all targetable entities from the current entity map.
   * Converts server tile positions to KAPPA-units for deterministic targeting.
   */
  function getTargetableEntities(): TargetableEntity[] {
    const entities: TargetableEntity[] = [];
    
    entities.current.forEach((entity, id) => {
      // Skip self
      if (id === "self") return;
      
      // Convert tile position to KAPPA-units
      const kappaX = Math.round(entity.tx * 1000);
      const kappaZ = Math.round(entity.tz * 1000);
      
      // Determine entity kind based on naming conventions
      let kind: TargetableEntity["kind"] = "npc";
      if (entity.isPlayer) kind = "player";
      
      entities.push({
        id,
        name: entity.name,
        kappaX,
        kappaZ,
        kind,
      });
    });
    
    return entities;
  }

  /**
   * Get the current facing direction based on last movement input.
   */
  function getCurrentFacing(): FacingDirection | null {
    const k = keys.current;
    let dx = 0, dz = 0;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    return inputToFacing(dx, dz);
  }

  /**
   * Spatial Auto-Targeting for Strike/Talk actions.
   * Determines the entity directly in front of the player based on
   * KAPPA-grid mathematics and current facing direction.
   * 
   * Returns null if no valid target found - NO RANDOM FALLBACK.
   */
  function getSpatialTarget(): string | null {
    const self = entities.current.get("self");
    if (!self) return null;
    
    const facing = getCurrentFacing();
    if (!facing) return null;
    
    const playerKappa = {
      x: Math.round(self.tx * 1000),
      z: Math.round(self.tz * 1000),
    };
    
    const allEntities = getTargetableEntities();
    const result = getFacingEntity(playerKappa, facing, allEntities, 1500);
    
    return result.targetId;
  }

  /**
   * Handle skill/action with spatial auto-targeting.
   * Uses KAPPA-grid math to determine the entity directly in front of the player.
   */
  function performTargetedAction(actionType: "strike" | "talk"): void {
    const targetId = getSpatialTarget();
    
    if (!targetId) {
      setMessages((items) => [...items.slice(-12), { from: "System", txt: `No target in facing direction.` }]);
      return;
    }
    
    const targetEntity = entities.current.get(targetId);
    const targetName = targetEntity?.name ?? targetId;
    
    if (actionType === "strike") {
      clientRef.current?.sendPlayerAction("strike", { targetId });
      dispatchClientAction("STRIKE_ENTITY", { targetId });
      setMessages((items) => [...items.slice(-12), { from: "Combat", txt: `Striking: ${targetName}` }]);
      
      // Visual feedback
      const fx = fxLayerRef.current;
      const self = entities.current.get("self");
      if (fx && self) {
        spawnFloatingStatus(fx, { x: self.root.x + 20, y: self.root.y - 28, text: "⚔ STRIKE" });
      }
    } else {
      sendInteractIntent(targetId);
      setMessages((items) => [...items.slice(-12), { from: "System", txt: `Talking to: ${targetName}` }]);
    }
  }

  function setActor(id: string, x: number, z: number, name: string, player: boolean, characterVisualId: string | null, weaponVisualId: string | null, entityClass: string = player ? 'player' : 'npc') {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    if (!app || !layer) return;
    
    // Get the interpolation manager singleton
    const interp = InterpolatedSpriteManager.getInstance();
    
    const existing = entities.current.get(id);
    if (existing) {
      // ─────────────────────────────────────────────────────────────────
      // EXISTING ENTITY: Update LOGICAL state + set RENDER target
      //
      // ARCHITECTURE: We update entity.tx/tz (logical truth from server)
      // but we do NOT modify sprite.x/y directly here. Instead, we set
      // the target position in InterpolatedSpriteManager, which will be
      // consumed by the PIXI.Ticker callback.
      //
      // This is the core of "Stateless Determinism": the logical kappa
      // position is NEVER mutated by the lerp. The render loop is purely
      // cosmetic and decoupled from the authoritative game state.
      // ─────────────────────────────────────────────────────────────────
      existing.tx = x;
      existing.tz = z;
      existing.name = name;
      existing.weaponVisualId = weaponVisualId ?? existing.weaponVisualId;
      
      // Calculate screen position from tile coordinates
      const screenPos = iso(x, z, app.screen.width, app.screen.height);
      
      // Register target position for interpolation (NOT instant move)
      interp.setTarget(id, screenPos.x, screenPos.y);
      
      // ─────────────────────────────────────────────────────────────────
      // DELTA-DRIVEN ANIMATION: Update AnimatedSpriteManager target
      //
      // The AnimatedSpriteManager reads from InterpolatedSpriteManager's
      // target positions to calculate delta-driven animation states.
      // This enables: idle (delta < 0.5px) → walk (delta >= 0.5px)
      // with direction calculated from movement vector.
      // ─────────────────────────────────────────────────────────────────
      const animMgr = AnimatedSpriteManager.getInstance();
      animMgr.setTarget(id, screenPos.x, screenPos.y);
      return;
    }
    
    // ─────────────────────────────────────────────────────────────────
    // NEW ENTITY: Spawn with initial position
    // For new entities, we DO set the sprite position immediately (spawn).
    // This is the only place where we directly modify sprite.x/y outside
    // the ticker loop.
    // ─────────────────────────────────────────────────────────────────
    const root = buildActorVisual({ name, player, assets: assetsRef.current, characterVisualId, weaponVisualId });
    if (!player) installNpcTapIntent(root, id, sendInteractIntent);
    placeActor(root, x, z, app.screen.width, app.screen.height);
    layer.addChild(root);
    entities.current.set(id, { root, tx: x, tz: z, name, isPlayer: player, weaponVisualId, characterVisualId });
    
    // Register actor with CombatFXManager for O(1) target lookup
    combatFXRef.current?.registerActor(id, root);
    
    // Register with interpolation manager for smooth movement
    // Initial position is the spawn position; subsequent updates will lerp
    const screenPos = iso(x, z, app.screen.width, app.screen.height);
    interp.register(id, root, screenPos.x, screenPos.y);
    
    // ─────────────────────────────────────────────────────────────────
    // DELTA-DRIVEN ANIMATION: Register with AnimatedSpriteManager
    //
    // The AnimatedSpriteManager requires:
    // 1. Entity metadata (type, class) for sprite-sheet mapping
    // 2. Initial screen position for delta calculation
    // 3. Container reference for sprite attachment
    //
    // It will then:
    // - Load directional walk cycles from AssetMapper
    // - Subscribe to InterpolatedSpriteManager for target updates
    // - Run delta-driven animation in 60 FPS ticker
    // ─────────────────────────────────────────────────────────────────
    const animMgr = AnimatedSpriteManager.getInstance();
    animMgr.setPositionManager(interp);
    animMgr.registerEntity(
      id,
      {
        entityId: id,
        entityType: player ? 'PLAYER' : 'NPC',
        entityClass,
        visualId: characterVisualId ?? undefined,
      },
      root,
      screenPos.x,
      screenPos.y,
    ).catch((err) => console.warn('[DeterministicWorldIsoApp] AnimatedSpriteManager registration failed:', err));
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
    
    // Re-register with interpolation manager (sprite was replaced)
    const interp = InterpolatedSpriteManager.getInstance();
    interp.remove(id); // Remove old reference
    const screenPos = iso(existing.tx, existing.tz, app.screen.width, app.screen.height);
    interp.register(id, root, screenPos.x, screenPos.y);
  }

  function sendMove(vector: MoveVector) {
    // Zero-Trust Input Lockdown: Block all movement during divergence
    if (inputLocked) {
      return;
    }
    const now = performance.now();
    if (!clientRef.current?.connected || now - lastMoveAt.current <= 140) return;
    lastMoveAt.current = now;
    clientRef.current.sendPlayerAction("MOVE", vector);
    const self = entities.current.get("self");
    const app = appRef.current;
    if (self && app) {
      self.tx += vector.dx;
      self.tz += vector.dz;
      
      // Update interpolation target for local movement prediction.
      // This ensures keyboard input remains visually responsive under normal
      // network latency, as the target is now immediately refreshed.
      const interp = InterpolatedSpriteManager.getInstance();
      const screenPos = iso(self.tx, self.tz, app.screen.width, app.screen.height);
      interp.setTarget("self", screenPos.x, screenPos.y);
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

        await app.init({
          backgroundAlpha: 0,
          resizeTo: host.current!,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(devicePixelRatio || 1, 2),
        });

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
        setMessages((items) => [...items.slice(-12), { from: "AssetBinder", txt: `Loaded ${assets.textures.size} textures for semantic world binding.` }]);

        const world = new Container();
        const terrain = new Container();
        const props = new Container();
        const actors = new Container();
        const fx = new Container();
        world.sortableChildren = true;
        terrain.sortableChildren = true;
        props.sortableChildren = true;
        actors.sortableChildren = true;
        fx.sortableChildren = true;
        worldLayerRef.current = world;
        actorLayerRef.current = actors;
        fxLayerRef.current = fx;
        
        // Initialize CombatFXManager for combat visual effects
        if (fx) {
          combatFXRef.current = new CombatFXManager(app, fx);
        }
        
        app.stage.sortableChildren = true;
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
        world.addChild(terrain, props, actors, fx);
        app.stage.addChild(world);
        app.stage.on("pointertap", (event) => {
          const point = fx.toLocal(event.global);
          spawnTouchRipple(fx, { x: point.x, y: point.y });
        });

        // Initialize ChunkManager for deterministic chunk streaming
        const binder = createWorldPlanAssetBinder(assets.manifest, (src) => textureFor(assets, src));
        console.log('[WorldSetup] binder created, manifest entries:', assets.manifest ? 'loaded' : 'null', 'textures:', assets.textures.size);
        const chunkManager = new ChunkManager({
          worldSeed: WORLD_SEED,
          biomeId: "forest_village",
          chunkTiles: 16,
          viewRadius: 1,
          throttleMs: 500,
        });
        // Extract entity class from NPC role (e.g., "npc_blacksmith" → "blacksmith")
        function extractEntityClass(role: string | undefined): string {
          if (!role) return 'npc';
          // Strip "npc_" prefix if present
          const stripped = role.replace(/^npc_/i, '');
          return stripped || 'npc';
        }

        chunkManager.init({
          worldContainer: terrain,  // Use terrain layer for chunks
          binder,
          textureFor: (src) => textureFor(assets, src),
          addNpcActor: ({ id, tileX, tileZ, name, role, characterVisualId }) => setActor(id, tileX, tileZ, roleDisplayName(role) || name, false, characterVisualId, null, extractEntityClass(role)),
          width: app.screen.width,
          height: app.screen.height,
        });
        chunkManagerRef.current = chunkManager;

        const plan = generateChunkScenePlan({ worldSeed: WORLD_SEED, chunkX: 0, chunkZ: 0, biomeId: "forest_village", kappa: 1000, chunkTiles: 16 });
        console.log('[WorldSetup] generated plan, terrain:', plan.terrain?.length, 'props:', plan.props?.length, 'settlement props:', plan.settlement?.props?.length, 'npcs:', plan.npcs?.length);
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
        startNetwork(app);
        app.ticker.add((ticker) => tick(app, ticker.deltaTime));

        setWorldBootPhase("world_ready");
        document.body.dataset.worldBoot = "world_ready";
      } catch (error) {
        console.error("[DeterministicWorldIsoApp] boot failed", error);

        const message =
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error ?? "unknown world boot error");

        setWorldBootPhase("failed");
        setWorldBootError(message);
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

  function startNetwork(app: Application) {
    const c = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = c;
    initLootFeedback(app, c);
    
    // Initialize combat FX event bridge
    if (combatFXRef.current) {
      initCombatFXBridge(c, combatFXRef.current);
    }
    
    c.on("connect" as any, () => { setConnected(true); setMessages((items) => [...items.slice(-12), { from: "Net", txt: "World stream connected." }]); });
    c.on("disconnect" as any, () => setConnected(false));
    c.on("WORLD_HEARTBEAT", (event: any) => {
      const selfId = event.payload?.self?.id;
      
      // Extract player positions and update actors
      const playerEntries = payloadEntries(event.payload?.players, "player");
      playerEntries.forEach(([id, player]: any) => {
        const actorId = selfId && id === selfId ? "self" : id;
        setActor(actorId, payloadCoord(player, "x"), payloadCoord(player, "z"), player.name || (actorId === "self" ? playerName : "Player"), true, null, player.weaponVisualId ?? player.equippedWeaponId ?? null);
      });
      
      if (event.payload?.self && (!selfId || !playerEntries.some(([id]) => id === selfId))) {
        const self = event.payload.self;
        setActor("self", payloadCoord(self, "x"), payloadCoord(self, "z"), self.name || playerName, true, null, self.weaponVisualId ?? self.equippedWeaponId ?? null);
      }
      
      // Update chunk visibility based on player kappa position
      // FIX: Force initial visibility update - without this, if player starts near (0,0),
      // the dx/dz >= 500 check prevents updateVisibility from ever being called
      if (event.payload?.self) {
        const self = event.payload.self;
        const playerKappa = {
          x: payloadCoord(self, "x") * 1000,  // Convert tile to kappa
          z: payloadCoord(self, "z") * 1000,
        };
        
        const dx = Math.abs(playerKappa.x - lastPlayerKappa.current.x);
        const dz = Math.abs(playerKappa.z - lastPlayerKappa.current.z);
        // FIX: Also update on first heartbeat to ensure initial chunk loading
        if (!hasInitializedVisibility.current || dx >= 500 || dz >= 500) {
          hasInitializedVisibility.current = true;
          lastPlayerKappa.current = playerKappa;
          chunkManagerRef.current?.updateVisibility(playerKappa);
        }
        
        // DEBUG: Update debug state for HUD display
        setDebugHeartbeatReceived(true);
        setDebugPlayerPos({ x: playerKappa.x, z: playerKappa.z });
        // Calculate chunk coords (kappa / (chunkTiles * 1000))
        const chunkX = Math.floor(playerKappa.x / (16 * 1000));
        const chunkZ = Math.floor(playerKappa.z / (16 * 1000));
        setDebugChunkCoords({ chunkX, chunkZ });
        // Get active chunk count from ChunkManager
        if (chunkManagerRef.current) {
          setDebugVisibleChunks(chunkManagerRef.current.getActiveChunkCount());
        }
        // Extract additional runtime values from heartbeat
        const tick = event.payload?.tick ?? event.payload?.serverTick ?? null;
        setDebugServerTick(tick);
        const selfId = event.payload?.self?.id ?? null;
        setDebugCharacter(selfId);
        // Set identity from playerName (or could use identityHash from login)
        setDebugIdentity(playerName);
        
        // Console debug log for deep debugging
        console.log("[PlayerPosDebug]", {
          heartbeatSelf: event.payload?.self,
          selfX: payloadCoord(event.payload?.self, "x"),
          selfZ: payloadCoord(event.payload?.self, "z"),
          playerKappa,
          lastPlayerKappa: lastPlayerKappa.current,
          chunkX,
          chunkZ,
        });

        // ─────────────────────────────────────────────────────────────────
        // DETERMINISTIC PLAYER VITALS - Server Authoritative Update
        // ═════════════════════════════════════════════════════════════════
        // Extract vitals from heartbeat payload and update playerVitalState.
        // This is deterministic: tick + acknowledgedSeq drive the update.
        // NO Date.now(), NO Math.random(), NO client-side prediction.
        // Note: tick already declared above at line 759
        const acknowledgedSeq = event.payload?.acknowledgedInputSeq ?? event.payload?.ackSeq ?? -1;
        
        if (tick !== null) {
          const vitalsUpdate = extractVitalsFromPayload(event.payload);
          if (Object.keys(vitalsUpdate).length > 0) {
            playerVitalState.onHeartbeatVitals(
              tick as number,
              acknowledgedSeq as number,
              vitalsUpdate
            );
          }
        }
      }
      
      payloadEntries(event.payload?.agents ?? event.payload?.npcs, "agent").forEach(([id, npc]: any) => {
        // Extract entity class from NPC role for AnimatedSpriteManager
        const entityClass = npc.role ? extractEntityClass(npc.role) : (npc.entityClass ?? 'npc');
        setActor(id, payloadCoord(npc, "x"), payloadCoord(npc, "z"), npc.name || npc.displayName || npc.role || "NPC", false, npc.characterVisualId ?? npc.visualId ?? null, null, entityClass);
      });
    });
    
    /**
     * WORLD_SNAPSHOT HANDLER
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Handles the spatial broadcast from the server (Axiom 4: Spatial Plexity).
     * 
     * The server sends only entities within the client's 3x3 chunk grid.
     * This handler:
     * 1. Extracts OTHER_PLAYER entities from the snapshot
     * 2. Creates/updates sprite visuals for each other player
     * 3. Garbage collects sprites for players who left the visible area
     * 
     * Per-Axiom 2 (Zero Client Prediction): Other player positions come
     * ONLY from the server. We never predict or extrapolate movement.
     * The InterpolatedSpriteManager handles smooth 60-FPS visual lerp.
     * 
     * GARBAGE COLLECTION STRATEGY:
     * - otherPlayerIds tracks currently visible player IDs
     * - After processing snapshot, any ID in the set but not in snapshot is gone
     * - Destroy its sprite, remove from entity map, unregister from interpolation
     * ═══════════════════════════════════════════════════════════════════════════
     */
    c.on("world_snapshot", (event: any) => {
      const app = appRef.current;
      const layer = actorLayerRef.current;
      if (!app || !layer) return;
      
      const snapshot = event.payload;
      if (!snapshot) return;
      
      // Get interpolation manager
      const interp = InterpolatedSpriteManager.getInstance();
      
      // Track IDs seen in this snapshot
      const seenPlayerIds = new Set<string>();
      
      // ─────────────────────────────────────────────────────────────────
      // Process OTHER_PLAYERS
      // These are players other than the local player (self)
      // ─────────────────────────────────────────────────────────────────
      const otherPlayers = snapshot.other_players ?? [];
      
      for (const player of otherPlayers) {
        const playerId = String(player.id);
        if (!playerId) continue;
        
        // Skip self - handled by WORLD_HEARTBEAT
        if (playerId === snapshot.self) continue;
        
        seenPlayerIds.add(playerId);
        
        const x = payloadCoord(player, "x");
        const z = payloadCoord(player, "z");
        const name = String(player.name || "Traveler");
        
        const existing = entities.current.get(playerId);
        
        if (existing) {
          // ─────────────────────────────────────────────────────────────────
          // EXISTING OTHER PLAYER: Update position via interpolation
          //
          // Per-ARE-Logic: We NEVER set sprite.x/y directly.
          // Only update logical position and push to InterpolatedSpriteManager.
          // ─────────────────────────────────────────────────────────────────
          existing.tx = x;
          existing.tz = z;
          
          const screenPos = iso(x, z, app.screen.width, app.screen.height);
          interp.setTarget(playerId, screenPos.x, screenPos.y);
        } else {
          // ─────────────────────────────────────────────────────────────────
          // NEW OTHER PLAYER: Create sprite with visual indicator
          //
          // Other players get a distinct visual treatment (different from NPCs).
          // Use player character visual + "other player" nameplate styling.
          // ─────────────────────────────────────────────────────────────────
          const root = buildActorVisual({ 
            name, 
            player: true, 
            assets: assetsRef.current, 
            characterVisualId: player.characterVisualId ?? null,
            weaponVisualId: player.weaponVisualId ?? null,
          });
          placeActor(root, x, z, app.screen.width, app.screen.height);
          layer.addChild(root);
          
          entities.current.set(playerId, { 
            root, 
            tx: x, 
            tz: z, 
            name, 
            isPlayer: true, 
            weaponVisualId: player.weaponVisualId ?? null,
            characterVisualId: player.characterVisualId ?? null,
          });
          
          // Register with interpolation for smooth visual movement
          const screenPos = iso(x, z, app.screen.width, app.screen.height);
          interp.register(playerId, root, screenPos.x, screenPos.y);
          
          // Optional: spawn join notification
          // setMessages((items) => [...items.slice(-12), { from: "Net", txt: `${name} entered the area.` }]);
        }
      }
      
      // ─────────────────────────────────────────────────────────────────
      // GARBAGE COLLECTION: Remove players no longer in visible set
      //
      // If a player ID was in our tracked set but is NOT in the current
      // snapshot, they moved out of our 3x3 chunk grid or disconnected.
      // We must clean up their sprite and interpolation registration.
      // ─────────────────────────────────────────────────────────────────
      for (const goneId of otherPlayerIds.current) {
        if (!seenPlayerIds.has(goneId)) {
          const entity = entities.current.get(goneId);
          if (entity) {
            // Destroy sprite and remove from layer
            entity.root.destroy({ children: true });
            entities.current.delete(goneId);
            
            // Unregister from interpolation manager
            interp.remove(goneId);
            
            // ─────────────────────────────────────────────────────────────────
            // DELTA-DRIVEN ANIMATION: Cleanup AnimatedSpriteManager
            //
            // Prevents memory leaks on mobile devices by cleaning up
            // the PIXI.AnimatedSprite instance and its textures.
            // ─────────────────────────────────────────────────────────────────
            AnimatedSpriteManager.getInstance().removeEntity(goneId);
            
            // Optional: spawn leave notification
            // const goneName = entity.name;
            // setMessages((items) => [...items.slice(-12), { from: "Net", txt: `${goneName} left the area.` }]);
          }
        }
      }
      
      // Update tracked player IDs for next snapshot
      otherPlayerIds.current = seenPlayerIds;
    });
    c.on("dialogue", (event: any) => {
      const payload = event.payload ?? event;
      const source = String(payload.source ?? payload.npcName ?? payload.targetId ?? "NPC");
      const text = String(
        payload.text ??
        payload.dialogueText ??
        payload.message ??
        payload.payload?.dialogueText ??
        ""
      );
      // Always show something — even if server sends empty text, show the intent
      const displayText = text || `[Dialogue with ${source}]`;
      setMessages((items) => [
        ...items.slice(-12),
        { from: source, txt: displayText }
      ]);
    });
    c.on("INTERACTION_ACCEPTED", (event: any) => {
      const payload = event.payload ?? event;
      const source = String(payload.source ?? payload.targetId ?? "NPC");
      const text = String(
        payload.dialogueText ??
        payload.message ??
        payload.payload?.dialogueText ??
        payload.payload?.message ??
        ""
      );
      // Always show something when interaction is accepted
      const displayText = text || `[Interaction accepted with ${source}]`;
      setMessages((items) => [
        ...items.slice(-12),
        { from: source, txt: displayText }
      ]);
    });
    /**
     * COMBAT_RESULT HANDLER
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Routes combat result events from the server to the chat overlay.
     * 
     * Event format:
     * {
     *   type: "combat_result",
     *   payload: {
     *     action: "strike" | "skill",
     *     attacker: string,
     *     target: string,
     *     damage?: number,
     *     success: boolean,
     *     message?: string
     *   }
     * }
     * 
     * Per-Axiom 1 (Server Authority): Combat results come from the server
     * and are displayed as system messages in the chat overlay.
     * ═══════════════════════════════════════════════════════════════════════════
     */
    c.on("combat_result", (event: any) => {
      const payload = event.payload ?? event;
      const attacker = String(payload.attacker ?? "Unknown");
      const target = String(payload.target ?? "Unknown");
      const damage = Number(payload.damage ?? 0);
      const success = Boolean(payload.success);
      
      let message = "";
      if (payload.message) {
        message = String(payload.message);
      } else if (success && damage > 0) {
        message = `${attacker} hits ${target} for ${damage} damage.`;
      } else if (!success) {
        message = `${attacker}'s attack on ${target} missed.`;
      }
      
      if (!message) return;
      
      setMessages((items) => [
        ...items.slice(-12),
        { from: "Combat", txt: message }
      ]);
    });
    /**
     * NPC_CHAT_MESSAGE HANDLER
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Routes NPC chat messages to the chat overlay.
     * NPCs emit periodic deterministic chat lines based on ARE-Logic.
     * 
     * Event format:
     * {
     *   type: "CHAT_MESSAGE",
     *   payload: {
     *     senderId: string,
     *     senderName: string,
     *     text: string,
     *     channel: "global" | "local"
     *   }
     * }
     * ═══════════════════════════════════════════════════════════════════════════
     */
    c.on("CHAT_MESSAGE", (event: any) => {
      const payload = event.payload ?? event;
      const senderName = String(payload.senderName ?? payload.sender ?? "Wanderer");
      const text = String(payload.text ?? "");
      
      if (!text) return;
      
      setMessages((items) => [
        ...items.slice(-12),
        { from: senderName, txt: text }
      ]);
    });
    /**
     * WORLD_EMERGENCE_EVENT HANDLER
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Routes NPC decomposition events to the chat overlay.
     * Shows when an NPC enters the decomposition phase (thermal collapse).
     * 
     * Event format:
     * {
     *   type: "WORLD_EMERGENCE_EVENT",
     *   payload: {
     *     npcId: string,
     *     eventType: string,
     *     reason: string
     *   }
     * }
     * ═══════════════════════════════════════════════════════════════════════════
     */
    c.on("WORLD_EMERGENCE_EVENT", (event: any) => {
      const payload = event.payload ?? event;
      const npcId = String(payload.npcId ?? "Unknown");
      const eventType = String(payload.eventType ?? "emergence");
      const reason = String(payload.reason ?? "");
      
      let message = `[${eventType}]`;
      if (reason) message += ` ${reason}`;
      
      setMessages((items) => [
        ...items.slice(-12),
        { from: "World", txt: message }
      ]);
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

    // ─────────────────────────────────────────────────────────────────
    // RENDER INTERPOLATION (60 FPS - Decoupled from WORLD_HEARTBEAT)
    //
    // The InterpolatedSpriteManager runs in the PIXI.Ticker loop,
    // smoothing the 10-Hz server position updates into fluid 60-FPS
    // visual motion. This is purely cosmetic; entity.tx/tz (logical
    // state) is NEVER modified here.
    //
    // Teleport-Snap: If distance > 150px, instant snap
    // Precision-Lock: If distance < 0.5px, snap to target
    // Normal: Exponential ease-out lerp with deltaTime scaling
    // ─────────────────────────────────────────────────────────────────
    const interp = InterpolatedSpriteManager.getInstance();
    interp.tick(deltaTime);

    // NPC bobbing animation - cosmetic visual flair applied AFTER lerp
    // This offset is purely additive and doesn't affect interpolation
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
    // Zero-Trust Input Lockdown: Block all skills during divergence
    if (inputLocked) {
      return;
    }
    // Special handling for atk (Strike) - uses spatial auto-targeting
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
    // Zero-Trust Input Lockdown: Block chat during divergence (optional - can allow)
    // Comment out if chat should be allowed during divergence
    // if (inputLocked) return;
    clientRef.current?.sendPlayerAction("chat", { text, channel: "local" });
    setMessages((items) => [...items.slice(-12), { from: playerName, txt: text }]);
  }

  function interact() {
    // Zero-Trust Input Lockdown: Block all interactions during divergence
    if (inputLocked) {
      return;
    }
    // Use spatial auto-targeting instead of hardcoded target
    performTargetedAction("talk");
  }

  /**
   * Direct strike action - uses spatial targeting to find entity in front.
   */
  function strikeAction() {
    performTargetedAction("strike");
  }

  return (
    <div className="az-shell" data-testid="deterministic-world-root">
      {/* Zero-Trust Divergence Alert - Military Panzerschrank Design */}
      {diverged && (
        <DivergenceAlert
          currentTick={currentTick}
          lastStateHash={lastStateHash}
          isResyncing={isResyncing}
          errorMessage={resyncError ?? undefined}
          retryCount={resyncAttempts}
          maxRetries={3}
        />
      )}
      
      {/* World Boot Status - normal status while Pixi initializes */}
      <div
        data-testid="world-boot-status"
        className={`world-boot-status world-boot-status--${worldBootPhase}`}
      >
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
        onStrike={strikeAction}
        onCycleWeapon={cycleEquippedWeapon}
        onToggleAutoMove={() => setMessages((items) => [...items.slice(-12), { from: "Navigator", txt: "WorldDirector routes are generated; auto-route execution follows server validation." }])}
        // Player vitals (Deterministic - server-authoritative)
        vitals={vitalsData}
        // DEBUG: Player position & chunk tracking
        debugPlayerPos={debugPlayerPos ?? undefined}
        debugChunkCoords={debugChunkCoords ?? undefined}
        debugVisibleChunks={debugVisibleChunks ?? undefined}
        debugHeartbeatReceived={debugHeartbeatReceived}
        debugInitialized={hasInitializedVisibility.current}
        // DEBUG: Additional runtime values
        debugNetworkStatus={connected ? "connected" : "disconnected"}
        debugServerTick={debugServerTick ?? undefined}
        debugAckSeq={debugAckSeq ?? undefined}
        debugIdentity={debugIdentity ?? undefined}
        debugCharacter={debugCharacter ?? undefined}
      />
    </div>
  );
}

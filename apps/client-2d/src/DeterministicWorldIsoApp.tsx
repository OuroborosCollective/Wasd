import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import { generateChunkScenePlan, type NpcRole } from "@wasd/shared";
import { ArelorianStitchHud } from "./ArelorianStitchHud";
import { fallbackEntry, loadAssetManifest, pickWeaponVisual, type AssetEntry, type AssetManifest } from "./assetManifest";
import { createWorldPlanAssetBinder } from "./world/WorldPlanAssetBinder";
import { renderChunkScenePlan } from "./world/renderChunkScenePlan";
import { iso3 } from "./isometricProjection";
import { initLootFeedback } from "./lootPickupFeedback";
import { makeModularWeaponSprite } from "./modularWeaponAssembler";
import { spawnFloatingStatus, spawnTouchRipple } from "./fxLogic";
import { moveVisualTowards } from "./visualMotion";

const TILE_W = 96;
const TILE_H = 48;
const EQUIPPED_WEAPON_KEY = "wasd:2d:equippedWeaponVisualId";
const WORLD_SEED = "areloria:earth_1_1";

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

export function DeterministicWorldIsoApp() {
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldLayerRef = useRef<Container | null>(null);
  const actorLayerRef = useRef<Container | null>(null);
  const fxLayerRef = useRef<Container | null>(null);
  const entities = useRef<Map<string, Entity>>(new Map());
  const assetsRef = useRef<LoadedAssets | null>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const keys = useRef(new Set<string>());
  const lastMoveAt = useRef(0);
  const playerName = localStorage.getItem("wasd:2d:name") || "Architect";
  const [connected, setConnected] = useState(false);
  const [assetStatus, setAssetStatus] = useState("ASSETS_LOADING");
  const [weaponCount, setWeaponCount] = useState(0);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(() => localStorage.getItem(EQUIPPED_WEAPON_KEY));
  const [messages, setMessages] = useState<Msg[]>([{ from: "WorldDirector", txt: "Deterministic Millbrook plan initializing." }]);

  function setActor(id: string, x: number, z: number, name: string, player: boolean, characterVisualId: string | null, weaponVisualId: string | null) {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    if (!app || !layer) return;
    const existing = entities.current.get(id);
    if (existing) {
      existing.tx = x;
      existing.tz = z;
      existing.name = name;
      existing.weaponVisualId = weaponVisualId ?? existing.weaponVisualId;
      return;
    }
    const root = buildActorVisual({ name, player, assets: assetsRef.current, characterVisualId, weaponVisualId });
    placeActor(root, x, z, app.screen.width, app.screen.height);
    layer.addChild(root);
    entities.current.set(id, { root, tx: x, tz: z, name, isPlayer: player, weaponVisualId, characterVisualId });
  }

  function rebuildActor(id: string, weaponVisualId: string | null) {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    const existing = entities.current.get(id);
    if (!app || !layer || !existing) return;
    const oldRoot = existing.root;
    const root = buildActorVisual({ name: existing.name, player: existing.isPlayer, assets: assetsRef.current, characterVisualId: existing.characterVisualId, weaponVisualId });
    placeActor(root, existing.tx, existing.tz, app.screen.width, app.screen.height);
    layer.addChild(root);
    oldRoot.destroy({ children: true });
    entities.current.set(id, { ...existing, root, weaponVisualId });
  }

  function sendMove(vector: MoveVector) {
    const now = performance.now();
    if (!clientRef.current?.connected || now - lastMoveAt.current <= 140) return;
    lastMoveAt.current = now;
    clientRef.current.sendPlayerAction("MOVE", vector);
    const self = entities.current.get("self");
    if (self) {
      self.tx += vector.dx;
      self.tz += vector.dz;
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
    const app = new Application();
    appRef.current = app;
    app.init({ backgroundAlpha: 0, resizeTo: host.current, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) }).then(async () => {
      host.current?.appendChild(app.canvas);
      const assets = await loadWorldAssets();
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
      app.stage.sortableChildren = true;
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
      world.addChild(terrain, props, actors, fx);
      app.stage.addChild(world);
      app.stage.on("pointertap", (event) => {
        const point = fx.toLocal(event.global);
        spawnTouchRipple(fx, { x: point.x, y: point.y });
      });

      const plan = generateChunkScenePlan({ worldSeed: WORLD_SEED, chunkX: 0, chunkZ: 0, biomeId: "forest_village", kappa: 1000, chunkTiles: 16 });
      const binder = createWorldPlanAssetBinder(assets.manifest, (src) => textureFor(assets, src));
      renderChunkScenePlan(plan, binder, {
        width: app.screen.width,
        height: app.screen.height,
        terrain,
        props,
        actors,
        textureFor: (entry) => textureFor(assets, entry?.src),
        addNpcActor: ({ id, tileX, tileZ, name, role, characterVisualId }) => setActor(id, tileX, tileZ, roleDisplayName(role) || name, false, characterVisualId, null),
      });

      const [centerX, centerZ] = plan.settlement.centerCell.split(":").map((value) => Number(value));
      setActor("self", centerX, centerZ + 1, playerName, true, null, initialWeaponId);
      startNetwork(app);
      app.ticker.add((ticker) => tick(app, ticker.deltaTime));
    });
    return () => {
      clientRef.current?.disconnect();
      app.destroy(true);
    };
  }, []);

  function startNetwork(app: Application) {
    const c = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = c;
    initLootFeedback(app, c);
    c.on("connect" as any, () => { setConnected(true); setMessages((items) => [...items.slice(-12), { from: "Net", txt: "World stream connected." }]); });
    c.on("disconnect" as any, () => setConnected(false));
    c.on("WORLD_HEARTBEAT", (event: any) => {
      const selfId = event.payload?.self?.id;
      const playerEntries = payloadEntries(event.payload?.players, "player");
      playerEntries.forEach(([id, player]: any) => {
        const actorId = selfId && id === selfId ? "self" : id;
        setActor(actorId, payloadCoord(player, "x"), payloadCoord(player, "z"), player.name || (actorId === "self" ? playerName : "Player"), true, null, player.weaponVisualId ?? player.equippedWeaponId ?? null);
      });
      if (event.payload?.self && (!selfId || !playerEntries.some(([id]) => id === selfId))) {
        const self = event.payload.self;
        setActor("self", payloadCoord(self, "x"), payloadCoord(self, "z"), self.name || playerName, true, null, self.weaponVisualId ?? self.equippedWeaponId ?? null);
      }
      payloadEntries(event.payload?.agents ?? event.payload?.npcs, "agent").forEach(([id, npc]: any) => {
        setActor(id, payloadCoord(npc, "x"), payloadCoord(npc, "z"), npc.name || npc.displayName || npc.role || "NPC", false, npc.characterVisualId ?? npc.visualId ?? null, null);
      });
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
    const now = performance.now();
    entities.current.forEach((entity) => {
      const point = iso(entity.tx, entity.tz, app.screen.width, app.screen.height);
      moveVisualTowards(entity.root, point, deltaTime);
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
    clientRef.current?.sendPlayerAction("interact", { targetId: "npc_elder_0" });
    setMessages((items) => [...items.slice(-12), { from: "System", txt: "Interaction ping sent." }]);
  }

  return (
    <div className="az-shell">
      <div className="az-world-glow" />
      <div ref={host} className="az-pixi" />
      <ArelorianStitchHud
        connected={connected}
        assetStatus={assetStatus}
        weaponCount={weaponCount}
        equippedWeaponId={equippedWeaponId}
        playerName={playerName}
        messages={messages}
        onSkill={sendSkill}
        onChat={sendChat}
        onInteract={interact}
        onCycleWeapon={cycleEquippedWeapon}
        onToggleAutoMove={() => setMessages((items) => [...items.slice(-12), { from: "Navigator", txt: "WorldDirector routes are generated; auto-route execution follows server validation." }])}
      />
    </div>
  );
}

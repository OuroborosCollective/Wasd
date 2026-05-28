import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import {
  fallbackEntry,
  loadAssetManifest,
  pickCharacterVisual,
  pickWeaponVisual,
  type AssetEntry,
  type AssetManifest,
} from "./assetManifest";
import {
  loadForestBiomeManifest,
  pickForestGround,
  pickForestGrass,
  type ForestBiomeAssetEntry,
  type ForestBiomeManifest,
} from "./forestBiomePicker";
import {
  forestGatherIntent,
  pickForestResourceNode,
  type ForestResourceNode,
} from "./forestResourceRegistry";
import { ArelorianStitchHud } from "./ArelorianStitchHud";
import { spawnFloatingStatus, spawnTouchRipple } from "./fxLogic";
import { iso3 } from "./isometricProjection";
import { initLootFeedback } from "./lootPickupFeedback";
import { make2dProp } from "./stackedProps";
import { moveVisualTowards } from "./visualMotion";
import { makeModularWeaponSprite } from "./modularWeaponAssembler";

const TILE_W = 96;
const TILE_H = 48;
const BIOME_TILE_W = 128;
const BIOME_TILE_H = 64;
const TERRAIN_Z_INDEX = -1000;
const EQUIPPED_WEAPON_KEY = "wasd:2d:equippedWeaponVisualId";
const FOREST_WORLD_SEED = "areloria:forest:millbrook:v1";
const KAPPA_INVARIANT = 1000;

type MoveVector = { dx: number; dz: number };

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

type Msg = { from: string; txt: string };

type LoadedAssets = {
  manifest: AssetManifest | null;
  forestManifest: ForestBiomeManifest | null;
  textures: Map<string, Texture>;
  forestTextures: Map<string, Texture>;
  ensureForestTexture: (entry: ForestBiomeAssetEntry | AssetEntry | null | undefined) => Promise<Texture | null>;
};

type CharacterSelection = {
  tags: string[];
  group?: string | null;
  kind?: string | null;
};

function iso(x: number, z: number, width: number, height: number) {
  const p = iso3({ gridX: x, gridZ: z, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
  return { x: p.x, y: p.y };
}

function diamond(color: number) {
  const g = new Graphics();
  g.moveTo(0, -TILE_H / 2);
  g.lineTo(TILE_W / 2, 0);
  g.lineTo(0, TILE_H / 2);
  g.lineTo(-TILE_W / 2, 0);
  g.closePath();
  g.fill(color);
  g.zIndex = TERRAIN_Z_INDEX;
  return g;
}

function isForestBiomeEntry(entry: AssetEntry | null | undefined): boolean {
  if (!entry?.src) return false;
  return entry.group === "forest" || entry.rules?.biome === "forest" || entry.src.includes("/assets/biomes/forest/");
}

async function loadTextureInto(cache: Map<string, Texture>, src: string): Promise<Texture | null> {
  const cached = cache.get(src);
  if (cached) return cached;

  try {
    const texture = await Assets.load<Texture>(src);
    cache.set(src, texture);
    return texture;
  } catch (err) {
    console.warn("[2DAssets] Failed to load", src, err);
    return null;
  }
}

function textureFor(assets: LoadedAssets | null, entry: AssetEntry | ForestBiomeAssetEntry | null): Texture | null {
  if (!assets || !entry?.src) return null;
  return assets.textures.get(entry.src) ?? assets.forestTextures.get(entry.src) ?? null;
}

function atlasFrameTextureFor(assets: LoadedAssets | null, entry: AssetEntry | null, animation = "idle_down"): Texture | null {
  if (!assets || !entry?.src) return null;
  const baseTexture = assets.textures.get(entry.src);
  if (!baseTexture) return null;

  if (entry.sheetFrame && entry.frameSize) {
    const anim = entry.animations?.[animation] as { row?: number; frames?: number[] } | undefined;
    const row = Number.isInteger(anim?.row) ? Number(anim?.row) : 0;
    const frameIndex = Number.isInteger(anim?.frames?.[0]) ? Number(anim?.frames?.[0]) : 1;
    return new Texture({
      source: baseTexture.source,
      frame: new Rectangle(
        entry.sheetFrame.x + frameIndex * entry.frameSize.w,
        entry.sheetFrame.y + row * entry.frameSize.h,
        entry.frameSize.w,
        entry.frameSize.h,
      ),
    });
  }

  if (entry.frame) {
    return new Texture({ source: baseTexture.source, frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h) });
  }

  return baseTexture;
}

function weaponTextureFor(assets: LoadedAssets | null, entry: AssetEntry | null): Texture | null {
  return atlasFrameTextureFor(assets, entry);
}

function spriteFromTexture(texture: Texture, width: number, height: number, y = 0) {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  s.width = width;
  s.height = height;
  s.y = y;
  return s;
}

function biomeTileSprite(texture: Texture) {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 0.5);
  s.width = BIOME_TILE_W;
  s.height = BIOME_TILE_H;
  return s;
}

function fallbackTreeProxy() {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 14, 24, 8).fill({ color: 0x010804, alpha: 0.5 }));
  c.addChild(new Graphics().roundRect(-5, -22, 10, 34, 4).fill(0x704323));
  c.addChild(new Graphics().circle(0, -42, 25).fill(0x14572f));
  c.addChild(new Graphics().circle(-9, -32, 18).fill(0x34a35e).stroke({ width: 1, color: 0xa7ffbf, alpha: 0.22 }));
  return c;
}

function fallbackHouseProxy() {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 18, 48, 12).fill({ color: 0x010804, alpha: 0.44 }));
  c.addChild(new Graphics().roundRect(-34, -36, 68, 48, 8).fill(0x7d5534).stroke({ width: 2, color: 0xffd890, alpha: 0.32 }));
  const roof = new Graphics();
  roof.moveTo(-44, -34);
  roof.lineTo(0, -70);
  roof.lineTo(44, -34);
  roof.lineTo(30, -18);
  roof.lineTo(-30, -18);
  roof.closePath();
  roof.fill(0x8e2c2b);
  roof.stroke({ width: 2, color: 0xffb568, alpha: 0.5 });
  c.addChild(roof, new Graphics().roundRect(-8, -16, 16, 28, 4).fill(0x21100a));
  return c;
}

function propTree(assets?: LoadedAssets | null) {
  const entry = fallbackEntry(assets?.manifest ?? null, "props", "tree");
  const tex = textureFor(assets ?? null, entry);
  return make2dProp(entry, tex, fallbackTreeProxy, 86, 104);
}

function propHouse(assets?: LoadedAssets | null) {
  const entry = fallbackEntry(assets?.manifest ?? null, "buildings", "house");
  const tex = textureFor(assets ?? null, entry);
  return make2dProp(entry, tex, fallbackHouseProxy, 118, 118);
}

function forestResourceSprite(node: ForestResourceNode, texture: Texture, onPick: (node: ForestResourceNode) => void) {
  const c = new Container();
  c.eventMode = "static";
  c.cursor = "pointer";
  c.addChild(new Graphics().ellipse(0, 15, 22, 7).fill({ color: 0x020a05, alpha: 0.42 }));
  c.addChild(spriteFromTexture(texture, node.definition.size.width, node.definition.size.height, node.definition.size.y ?? 0));
  c.on("pointertap", () => onPick(node));
  return c;
}

function addWeaponSprite(c: Container, assets: LoadedAssets | null | undefined, name: string, weaponVisualId?: string | null) {
  const manifest = assets?.manifest ?? null;
  const weapon = pickWeaponVisual(manifest, { visualId: weaponVisualId, seed: name });
  const entry = weapon?.entry ?? null;
  const modular = makeModularWeaponSprite(manifest, assets?.textures ?? new Map(), {
    visualId: weaponVisualId ?? weapon?.id ?? null,
    seed: name + ":" + (weaponVisualId ?? weapon?.id ?? "auto"),
    weaponClass: entry?.weaponClass ?? entry?.rules?.weaponClass ?? entry?.kind ?? null,
    rarity: entry?.visualRarity ?? entry?.rarity ?? null,
  });

  if (modular) {
    c.addChild(modular);
    return;
  }

  const tex = weaponTextureFor(assets ?? null, entry);
  if (!tex) return;

  const weaponSprite = spriteFromTexture(tex, 42, 42, 0);
  weaponSprite.x = 16;
  weaponSprite.y = -24;
  weaponSprite.rotation = 0.35;
  weaponSprite.alpha = 0.96;
  c.addChild(weaponSprite);
}

function deterministicIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

function chooseCivilianGroup(seed: string): string {
  return ["Female", "Male"][deterministicIndex(seed, 2)] ?? "Male";
}

function characterSelectionForName(name: string, player = false, seed = name): CharacterSelection {
  const lower = name.toLowerCase();
  if (player) return { tags: ["civilian"], group: chooseCivilianGroup(`player:${seed}`) };
  if (lower.includes("boss") || lower.includes("apex")) return { tags: ["boss"], group: "Boss", kind: "boss" };
  if (lower.includes("guard") || lower.includes("soldier") || lower.includes("warfront")) return { tags: ["soldier"], group: "Soldier" };
  if (lower.includes("animal") || lower.includes("wolf")) return { tags: ["animal"], group: "Animal", kind: "animal" };
  if (lower.includes("enemy") || lower.includes("goblin") || lower.includes("monster")) return { tags: ["enemy"], group: "Enemy", kind: "enemy" };
  return { tags: ["civilian"], group: chooseCivilianGroup(`npc:${seed}:${lower}`) };
}

function fallbackActorProxy(player: boolean, aura: number) {
  const c = new Container();
  const tunic = player ? 0x2f7dff : 0x2fbf70;
  const trim = player ? 0x00e5ff : 0x39ff14;
  c.addChild(new Graphics().ellipse(0, 18, 18, 6).fill({ color: 0x02040a, alpha: 0.64 }));
  c.addChild(new Graphics().roundRect(-10, -30, 20, 32, 6).fill(tunic).stroke({ width: 2, color: trim, alpha: 0.56 }));
  c.addChild(new Graphics().circle(0, -43, 11).fill(player ? 0xffd8a9 : 0xd4ffd7).stroke({ width: 2, color: aura, alpha: 0.82 }));
  c.addChild(new Graphics().roundRect(-18, -25, 8, 24, 4).fill(0x1d3c6b));
  c.addChild(new Graphics().roundRect(10, -25, 8, 24, 4).fill(0x1d3c6b));
  c.addChild(new Graphics().roundRect(-8, 1, 6, 18, 3).fill(0x13202f));
  c.addChild(new Graphics().roundRect(2, 1, 6, 18, 3).fill(0x13202f));
  c.addChild(new Graphics().circle(0, -24, 21).stroke({ width: 1, color: aura, alpha: 0.28 }));
  return c;
}

function avatar(name: string, player = false, assets?: LoadedAssets | null, weaponVisualId?: string | null, characterVisualId?: string | null) {
  const c = new Container();
  const aura = player ? 0x00e5ff : 0x39ff14;
  const selection = characterSelectionForName(name, player, characterVisualId ?? name);
  const picked = pickCharacterVisual(assets?.manifest ?? null, {
    visualId: characterVisualId,
    tags: selection.tags,
    group: selection.group,
    kind: selection.kind,
    seed: `${player ? "player" : "npc"}:${name}:${characterVisualId ?? "auto"}`,
  });
  const entry = picked?.entry ?? fallbackEntry(assets?.manifest ?? null, "characters", player ? "player" : "npc");
  const tex = atlasFrameTextureFor(assets ?? null, entry, "idle_down") ?? textureFor(assets ?? null, entry);
  c.addChild(new Graphics().ellipse(0, 18, 23, 8).fill({ color: 0x02040a, alpha: 0.56 }));
  if (tex) c.addChild(spriteFromTexture(tex, 58, 74));
  else c.addChild(fallbackActorProxy(player, aura));
  addWeaponSprite(c, assets, name, weaponVisualId);
  const label = new Text({ text: name, style: { fontSize: 11, fill: 0xfff0cf, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" } });
  label.anchor.set(0.5, 1);
  label.y = -58;
  c.addChild(label);
  return c;
}

function place(node: Container, x: number, z: number, width: number, height: number, zHeight = 0) {
  const p = iso3({ gridX: x, gridZ: z, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: zHeight });
  node.x = p.x;
  node.y = p.y;
  node.zIndex = p.zIndex;
}

function weaponIds(manifest: AssetManifest | null | undefined): string[] {
  return Object.keys(manifest?.weapons ?? {}).sort();
}

function characterIds(manifest: AssetManifest | null | undefined): string[] {
  return Object.keys(manifest?.characters ?? {}).filter((id) => id.startsWith("pipoya_")).sort();
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

function payloadEntries(source: any, fallbackPrefix: string): [string, any][] {
  if (Array.isArray(source)) {
    return source.map((entry, index) => [String(entry?.id ?? entry?.playerId ?? entry?.agentId ?? entry?.npcId ?? `${fallbackPrefix}-${index}`), entry]);
  }
  return Object.entries(source ?? {}) as [string, any][];
}

function payloadCoord(entity: any, axis: "x" | "z"): number {
  const value = axis === "x"
    ? entity?.x ?? entity?.gridX ?? entity?.position?.x ?? entity?.pos?.x
    : entity?.z ?? entity?.gridZ ?? entity?.position?.z ?? entity?.pos?.z ?? entity?.y;
  return Number(value ?? 0);
}

async function load2DAssets(): Promise<LoadedAssets> {
  const manifest = await loadAssetManifest();
  const forestManifest = await loadForestBiomeManifest();
  const textures = new Map<string, Texture>();
  const forestTextures = new Map<string, Texture>();
  const eagerUrls = new Set<string>();

  if (manifest) {
    [manifest.tilesets, manifest.characters, manifest.monsters, manifest.buildings, manifest.props, manifest.fx, manifest.ui, manifest.weapons].forEach((group) => {
      Object.values(group ?? {}).forEach((entry) => {
        if (!entry.src) return;
        if (isForestBiomeEntry(entry)) return;
        eagerUrls.add(entry.src);
      });
    });
  }

  await Promise.all([...eagerUrls].map((url) => loadTextureInto(textures, url)));

  return {
    manifest,
    forestManifest,
    textures,
    forestTextures,
    ensureForestTexture: (entry) => entry?.src ? loadTextureInto(forestTextures, entry.src) : Promise.resolve(null),
  };
}

export function CyberZenIsoApp() {
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldLayerRef = useRef<Container | null>(null);
  const actorLayerRef = useRef<Container | null>(null);
  const fxLayerRef = useRef<Container | null>(null);
  const assetRef = useRef<LoadedAssets | null>(null);
  const entities = useRef<Map<string, Entity>>(new Map());
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const keys = useRef(new Set<string>());
  const moveAt = useRef(0);
  const playerName = localStorage.getItem("wasd:2d:name") || "Architect";
  const [connected, setConnected] = useState(false);
  const [assetStatus, setAssetStatus] = useState("ASSETS_LOADING");
  const [weaponCount, setWeaponCount] = useState(0);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(() => localStorage.getItem(EQUIPPED_WEAPON_KEY));
  const [messages, setMessages] = useState<Msg[]>([{ from: "Oracle", txt: "Cyberzen 2.5D shell online." }]);

  function sendMove(vector: MoveVector) {
    if (!clientRef.current?.connected) return;
    if (Date.now() - moveAt.current <= 140) return;
    moveAt.current = Date.now();
    clientRef.current.sendPlayerAction("MOVE", vector);
  }

  useEffect(() => {
    window.__wasd2dMove = sendMove;
    return () => {
      if (window.__wasd2dMove === sendMove) delete window.__wasd2dMove;
    };
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
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
      host.current!.appendChild(app.canvas);
      const loaded = await load2DAssets();
      assetRef.current = loaded;
      const textureCount = loaded.textures.size + loaded.forestTextures.size;
      const weapons = weaponIds(loaded.manifest).length;
      const characters = characterIds(loaded.manifest).length;
      const forestEntries = Object.keys(loaded.forestManifest?.entries ?? {}).length;
      const initialWeaponId = resolveEquippedWeaponId(loaded.manifest, playerName);
      setEquippedWeaponId(initialWeaponId);
      setWeaponCount(weapons);
      setAssetStatus(textureCount > 0 ? `ASSETS_${textureCount}_LOADED` : "PROXY_GRAPHICS");
      setMessages(m => [...m.slice(-12), { from: "AssetRig", txt: textureCount > 0 ? `Loaded ${textureCount} textures, ${characters} characters, ${weapons} weapons and ${forestEntries} forest entries.` : "No manifest textures yet. Using proxy graphics." }]);
      const world = new Container();
      const terrain = new Container();
      const props = new Container();
      const actors = new Container();
      const fx = new Container();
      world.sortableChildren = true;
      worldLayerRef.current = world;
      terrain.sortableChildren = true;
      terrain.zIndex = TERRAIN_Z_INDEX;
      props.sortableChildren = true;
      actors.sortableChildren = true;
      fx.sortableChildren = true;
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
      await buildScene(app, terrain, props, loaded);
      addActor(app, actors, "self", 0, 0, playerName, true, loaded, initialWeaponId);
      addActor(app, actors, "elder", 2, 1, "Millbrook Elder", false, loaded);
      startNetwork(app, actors);
      app.ticker.add((ticker) => tick(app, actors, ticker.deltaTime));
    });
    return () => {
      clientRef.current?.disconnect();
      app.destroy(true);
    };
  }, []);

  function sendForestGather(node: ForestResourceNode) {
    clientRef.current?.sendPlayerAction("GATHER_RESOURCE", forestGatherIntent(node));
  }

  async function buildScene(app: Application, terrain: Container, props: Container, assets?: LoadedAssets | null) {
    const forest = assets?.forestManifest ?? null;
    for (let z = -7; z <= 7; z++) for (let x = -7; x <= 7; x++) {
      const ground = pickForestGround(forest, { worldSeed: FOREST_WORLD_SEED, chunkX: 0, chunkZ: 0, tileX: x, tileZ: z, layer: 0 });
      const grass = ground ? null : pickForestGrass(forest, { worldSeed: FOREST_WORLD_SEED, chunkX: 0, chunkZ: 0, tileX: x, tileZ: z, layer: 1 });
      const terrainTex = await assets?.ensureForestTexture(ground ?? grass);
      const tile = terrainTex ? biomeTileSprite(terrainTex) : diamond((x + z) % 4 === 0 ? 0x3f7f48 : 0x356b40);
      tile.zIndex = TERRAIN_Z_INDEX;
      place(tile, x, z, app.screen.width, app.screen.height);
      terrain.addChild(tile);

      const node = pickForestResourceNode(forest, { worldSeed: FOREST_WORLD_SEED, chunkX: 0, chunkZ: 0, tileX: x, tileZ: z, kappa: KAPPA_INVARIANT });
      if (node) {
        const resourceTex = await assets?.ensureForestTexture(node.asset);
        if (resourceTex) {
          const sprite = forestResourceSprite(node, resourceTex, sendForestGather);
          place(sprite, x, z, app.screen.width, app.screen.height);
          props.addChild(sprite);
        }
      }
    }
    [[-4, -2], [4, -3], [-5, 3], [5, 2]].forEach(([x, z]) => {
      const t = propTree(assets);
      place(t, x, z, app.screen.width, app.screen.height);
      props.addChild(t);
    });
    [[-2, 2], [2, 2], [0, -4]].forEach(([x, z]) => {
      const h = propHouse(assets);
      place(h, x, z, app.screen.width, app.screen.height);
      props.addChild(h);
    });
    props.sortChildren();
  }

  function addActor(app: Application, layer: Container, id: string, x: number, z: number, name: string, player: boolean, assets = assetRef.current, weaponVisualId?: string | null) {
    const existing = entities.current.get(id);
    if (existing) {
      existing.tx = x;
      existing.tz = z;
      if (player && weaponVisualId !== undefined && weaponVisualId !== existing.weaponVisualId) {
        rebuildActorVisual(id, weaponVisualId);
        if (id === "self") {
          setEquippedWeaponId(weaponVisualId);
          if (weaponVisualId) localStorage.setItem(EQUIPPED_WEAPON_KEY, weaponVisualId);
          else localStorage.removeItem(EQUIPPED_WEAPON_KEY);
        }
      }
      return;
    }
    const resolvedWeaponId = player ? (weaponVisualId ?? equippedWeaponId) : pickWeaponVisual(assets?.manifest ?? null, { seed: name })?.id ?? null;
    const selection = characterSelectionForName(name, player, `${id}:${name}`);
    const characterVisualId = pickCharacterVisual(assets?.manifest ?? null, {
      tags: selection.tags,
      group: selection.group,
      kind: selection.kind,
      seed: `${id}:${name}`,
    })?.id ?? null;
    const root = avatar(name, player, assets, resolvedWeaponId, characterVisualId);
    place(root, x, z, app.screen.width, app.screen.height);
    layer.addChild(root);
    entities.current.set(id, { root, tx: x, tz: z, name, isPlayer: player, weaponVisualId: resolvedWeaponId, characterVisualId });
  }

  function rebuildActorVisual(id: string, weaponVisualId: string | null) {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    const assets = assetRef.current;
    const ent = entities.current.get(id);
    if (!app || !layer || !ent) return;

    const oldRoot = ent.root;
    const root = avatar(ent.name, ent.isPlayer, assets, weaponVisualId, ent.characterVisualId);
    place(root, ent.tx, ent.tz, app.screen.width, app.screen.height);
    layer.addChild(root);
    oldRoot.destroy({ children: true });
    entities.current.set(id, { ...ent, root, weaponVisualId });
  }

  function cycleEquippedWeapon() {
    const ids = weaponIds(assetRef.current?.manifest);
    if (ids.length === 0) {
      setMessages(m => [...m.slice(-12), { from: "Inventory", txt: "No weapon visuals loaded yet." }]);
      return;
    }
    const current = equippedWeaponId ?? localStorage.getItem(EQUIPPED_WEAPON_KEY);
    const currentIndex = current ? ids.indexOf(current) : -1;
    const next = ids[(currentIndex + 1 + ids.length) % ids.length];
    localStorage.setItem(EQUIPPED_WEAPON_KEY, next);
    setEquippedWeaponId(next);
    rebuildActorVisual("self", next);
    setMessages(m => [...m.slice(-12), { from: "Inventory", txt: `Equipped weapon visual: ${next}` }]);
  }

  function startNetwork(app: Application, layer: Container) {
    const c = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = c;
    initLootFeedback(app, c);
    c.on("connect" as any, () => { setConnected(true); setMessages(m => [...m.slice(-12), { from: "Net", txt: "World stream connected." }]); });
    c.on("disconnect" as any, () => setConnected(false));
    c.on("WORLD_HEARTBEAT", (e: any) => {
      const selfId = e.payload?.self?.id;
      const playerEntries = payloadEntries(e.payload?.players, "player");
      playerEntries.forEach(([id, p]: any) => {
        const actorId = selfId && id === selfId ? "self" : id;
        const nextWeaponId = p.weaponVisualId ?? p.equippedWeaponId ?? null;
        addActor(app, layer, actorId, payloadCoord(p, "x"), payloadCoord(p, "z"), p.name || (actorId === "self" ? playerName : "Player"), true, assetRef.current, nextWeaponId);
      });
      if (e.payload?.self && (!selfId || !playerEntries.some(([id]) => id === selfId))) {
        const self = e.payload.self;
        addActor(app, layer, "self", payloadCoord(self, "x"), payloadCoord(self, "z"), self.name || playerName, true, assetRef.current, self.weaponVisualId ?? self.equippedWeaponId ?? null);
      }
      payloadEntries(e.payload?.agents ?? e.payload?.npcs, "agent").forEach(([id, a]: any) => {
        addActor(app, layer, id, payloadCoord(a, "x"), payloadCoord(a, "z"), a.name || a.displayName || "NPC", false);
      });
    });
    c.on("PLAYER_MOVED", (e: any) => {
      const ent = entities.current.get(e.payload?.playerId);
      if (ent) {
        ent.tx = Number(e.payload.x || ent.tx);
        ent.tz = Number(e.payload.z || ent.tz);
      }
    });
    c.connect();
  }

  function followCamera(app: Application, deltaTime = 1) {
    const world = worldLayerRef.current;
    const self = entities.current.get("self");
    if (!world || !self) return;
    const targetX = app.screen.width / 2 - self.root.x;
    const targetY = app.screen.height / 2 - self.root.y - 18;
    const ease = Math.min(0.16 * deltaTime, 0.35);
    world.x += (targetX - world.x) * ease;
    world.y += (targetY - world.y) * ease;
  }

  function tick(app: Application, layer: Container, deltaTime = 1) {
    let dx = 0, dz = 0;
    const k = keys.current;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (dx || dz) sendMove({ dx, dz });
    const now = performance.now();
    entities.current.forEach((ent) => {
      const p = iso(ent.tx, ent.tz, app.screen.width, app.screen.height);
      moveVisualTowards(ent.root, p, deltaTime);
      if (!ent.isPlayer) {
        const phase = deterministicIndex(ent.name, 31) * 0.27;
        ent.root.y += Math.sin(now / 620 + phase) * 1.2;
        ent.root.rotation = Math.sin(now / 900 + phase) * 0.01;
      }
    });
    followCamera(app, deltaTime);
  }

  function spawnLocalSkillFx(skillId: string) {
    const fx = fxLayerRef.current;
    const self = entities.current.get("self");
    if (!fx || !self) return;
    const label = skillId === "atk" ? "STRIKE" : skillId.toUpperCase();
    spawnTouchRipple(fx, { x: self.root.x + 20, y: self.root.y - 28 });
    spawnFloatingStatus(fx, { x: self.root.x + 24, y: self.root.y - 34, text: label });
  }

  function sendSkill(skillId: string) {
    spawnLocalSkillFx(skillId);
    clientRef.current?.sendPlayerAction("USE_SKILL", { skillId, weaponVisualId: equippedWeaponId });
    setMessages(m => [...m.slice(-12), { from: "Combat", txt: `Skill queued: ${skillId}` }]);
  }

  function sendChat(text: string) {
    clientRef.current?.sendPlayerAction("chat", { text, channel: "local" });
    setMessages(m => [...m.slice(-12), { from: playerName, txt: text }]);
  }

  function interact() {
    clientRef.current?.sendPlayerAction("interact", { targetId: "elder" });
    setMessages(m => [...m.slice(-12), { from: "System", txt: "Interaction ping sent." }]);
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
        onToggleAutoMove={() => setMessages(m => [...m.slice(-12), { from: "Navigator", txt: "Auto-route planner not yet linked." }])}
      />
    </div>
  );
}

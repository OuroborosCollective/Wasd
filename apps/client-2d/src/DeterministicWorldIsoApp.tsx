import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { deriveChunkBiome, generateChunkScenePlan } from "@wasd/shared";
import { ArelorianStitchHud } from "./ArelorianStitchHud";
import { iso3, TILE_W, TILE_H } from "./isometricProjection";
import { BootSurface, type BootState } from "./ui/BootSurface";
import { ResourceNodeMarkerLayer } from "./ui/ResourceNodeMarkerLayer";
import { WorldPoiMarkerLayer } from "./ui/WorldPoiMarkerLayer";
import { CampNpcMarkerLayer } from "./ui/CampNpcMarkerLayer";

const RUNTIME_WORLD_SEED_KEY = "wasd:runtime:worldSeed";
const CHUNK_TILES = 16;
const KAPPA_PER_TILE = 1000;
const VIEW_RADIUS = 2;

type MoveVector = { dx: number; dz: number };
type Msg = { from: string; txt: string };
type Actor = { root: Container; baseX: number; baseZ: number; name: string; player: boolean; phase: number };

declare global {
  interface Window {
    __wasd2dMove?: (vector: MoveVector) => void;
  }
}

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
  return `Architect-${suffix}`;
}

function hashPhase(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 1000;
}

function chunkCoord(tile: number): number {
  return Math.floor(tile / CHUNK_TILES);
}

function worldIso(tileX: number, tileZ: number, width: number, height: number) {
  return iso3({ gridX: tileX, gridZ: tileZ, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
}

function terrainColor(kind: string): number {
  if (kind === "road_edge") return 0x705333;
  if (kind === "stone") return 0x59615f;
  if (kind === "forest_floor") return 0x345f3e;
  return 0x3f7f48;
}

function diamond(color: number): Graphics {
  const g = new Graphics();
  g.moveTo(0, -TILE_H / 2);
  g.lineTo(TILE_W / 2, 0);
  g.lineTo(0, TILE_H / 2);
  g.lineTo(-TILE_W / 2, 0);
  g.closePath();
  g.fill(color);
  g.stroke({ width: 1, color: 0x0b1b12, alpha: 0.18 });
  return g;
}

function actorVisual(name: string, player: boolean): Container {
  const root = new Container();
  const body = player ? 0x2f7dff : 0x456b38;
  const trim = player ? 0x00e5ff : 0xf0c36a;
  root.addChild(new Graphics().ellipse(0, 18, 22, 8).fill({ color: 0x02040a, alpha: 0.56 }));
  root.addChild(new Graphics().roundRect(-12, -32, 24, 38, 6).fill(body).stroke({ width: 2, color: trim, alpha: 0.62 }));
  root.addChild(new Graphics().circle(0, -47, 12).fill(0xffd8a9));
  const label = new Text({ text: name, style: { fontSize: 11, fill: 0xfff0cf, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" } });
  label.anchor.set(0.5, 1);
  label.y = -62;
  root.addChild(label);
  return root;
}

function bootStateFromPhase(phase: "mounting" | "pixi_init" | "world_ready" | "failed"): BootState {
  if (phase === "world_ready") return "ready";
  if (phase === "failed") return "error";
  if (phase === "pixi_init") return "initializing";
  return "waiting";
}

export function DeterministicWorldIsoApp() {
  const seedRef = useRef(runtimeWorldSeed());
  const playerName = runtimePlayerName(seedRef.current);
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const terrainRef = useRef<Container | null>(null);
  const actorLayerRef = useRef<Container | null>(null);
  const actorsRef = useRef<Map<string, Actor>>(new Map());
  const loadedChunksRef = useRef<Set<string>>(new Set());
  const keysRef = useRef(new Set<string>());
  const playerTileRef = useRef({ x: 8, z: 9 });
  const lastMoveAtRef = useRef(0);
  const [phase, setPhase] = useState<"mounting" | "pixi_init" | "world_ready" | "failed">("mounting");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([{ from: "WorldDirector", txt: "Deterministic world renderer initializing." }]);
  const [debugPlayerPos, setDebugPlayerPos] = useState<{ x: number; z: number } | null>(null);
  const [debugChunkCoords, setDebugChunkCoords] = useState<{ chunkX: number; chunkZ: number } | null>(null);
  const [debugVisibleChunks, setDebugVisibleChunks] = useState<number | null>(null);

  function placeActor(id: string, x: number, z: number, name: string, player: boolean): void {
    const app = appRef.current;
    const layer = actorLayerRef.current;
    if (!app || !layer) return;
    const existing = actorsRef.current.get(id);
    const point = worldIso(x, z, app.screen.width, app.screen.height);
    if (existing) {
      existing.baseX = x;
      existing.baseZ = z;
      existing.root.x = point.x;
      existing.root.y = point.y;
      existing.root.zIndex = Math.round(point.y);
      return;
    }
    const root = actorVisual(name, player);
    root.x = point.x;
    root.y = point.y;
    root.zIndex = Math.round(point.y);
    layer.addChild(root);
    actorsRef.current.set(id, { root, baseX: x, baseZ: z, name, player, phase: hashPhase(`${id}:${name}`) });
  }

  function renderChunk(chunkX: number, chunkZ: number): void {
    const app = appRef.current;
    const terrain = terrainRef.current;
    if (!app || !terrain) return;
    const key = `${chunkX}:${chunkZ}`;
    if (loadedChunksRef.current.has(key)) return;
    loadedChunksRef.current.add(key);

    const biomeId = deriveChunkBiome(chunkX, chunkZ, seedRef.current);
    const plan = generateChunkScenePlan({ worldSeed: seedRef.current, chunkX, chunkZ, biomeId, kappa: KAPPA_PER_TILE, chunkTiles: CHUNK_TILES });
    const chunkLayer = new Container();
    chunkLayer.sortableChildren = true;
    terrain.addChild(chunkLayer);

    for (const cell of plan.terrain) {
      const wx = chunkX * CHUNK_TILES + cell.tileX;
      const wz = chunkZ * CHUNK_TILES + cell.tileZ;
      const p = worldIso(wx, wz, app.screen.width, app.screen.height);
      const tile = diamond(terrainColor(cell.terrainType));
      tile.x = p.x;
      tile.y = p.y;
      tile.zIndex = Math.round(p.y) - 1000;
      chunkLayer.addChild(tile);
    }

    for (const [roadCell] of Object.entries(plan.roads.roadCells)) {
      const [xRaw, zRaw] = roadCell.split(":").map(Number);
      const wx = chunkX * CHUNK_TILES + xRaw;
      const wz = chunkZ * CHUNK_TILES + zRaw;
      const p = worldIso(wx, wz, app.screen.width, app.screen.height);
      const road = diamond(0x87633f);
      road.scale.set(0.72, 0.72);
      road.x = p.x;
      road.y = p.y;
      road.zIndex = Math.round(p.y) - 900;
      chunkLayer.addChild(road);
    }

    for (const prop of [...plan.settlement.props, ...plan.props]) {
      const wx = chunkX * CHUNK_TILES + prop.tileX;
      const wz = chunkZ * CHUNK_TILES + prop.tileZ;
      const p = worldIso(wx, wz, app.screen.width, app.screen.height);
      const color = prop.propType === "stone" ? 0x888888 : prop.propType === "flower" ? 0xc84c8a : 0x2f8d4d;
      const node = new Graphics().circle(0, -18, prop.propType === "tree" ? 18 : 9).fill(color);
      node.x = p.x;
      node.y = p.y;
      node.zIndex = Math.round(p.y) - 10;
      chunkLayer.addChild(node);
    }

    for (const lot of plan.settlement.lots) {
      const wx = chunkX * CHUNK_TILES + lot.tileX + lot.widthTiles / 2;
      const wz = chunkZ * CHUNK_TILES + lot.tileZ + lot.depthTiles / 2;
      const p = worldIso(wx, wz, app.screen.width, app.screen.height);
      const house = new Container();
      house.addChild(new Graphics().ellipse(0, 30, 60, 16).fill({ color: 0x030804, alpha: 0.45 }));
      house.addChild(new Graphics().roundRect(-42, -54, 84, 70, 8).fill(0x7d5534));
      const roof = new Graphics();
      roof.moveTo(-56, -50);
      roof.lineTo(0, -104);
      roof.lineTo(56, -50);
      roof.closePath();
      roof.fill(0x8e2c2b);
      house.addChild(roof);
      house.x = p.x;
      house.y = p.y;
      house.zIndex = Math.round(p.y);
      chunkLayer.addChild(house);
    }

    for (const npc of plan.npcs) {
      const wx = chunkX * CHUNK_TILES + npc.tileX;
      const wz = chunkZ * CHUNK_TILES + npc.tileZ;
      placeActor(npc.id, wx, wz, npc.role.replace(/_/g, " "), false);
    }
  }

  function ensureChunksAroundPlayer(force = false): void {
    const app = appRef.current;
    if (!app) return;
    const player = playerTileRef.current;
    const centerX = chunkCoord(player.x);
    const centerZ = chunkCoord(player.z);
    for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz += 1) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx += 1) renderChunk(centerX + dx, centerZ + dz);
    }
    const kappa = { x: Math.round(player.x * KAPPA_PER_TILE), z: Math.round(player.z * KAPPA_PER_TILE) };
    setDebugPlayerPos(kappa);
    setDebugChunkCoords({ chunkX: centerX, chunkZ: centerZ });
    setDebugVisibleChunks(loadedChunksRef.current.size);
    if (force) setMessages((items) => [...items.slice(-12), { from: "World", txt: `Loaded ${loadedChunksRef.current.size} deterministic chunks.` }]);
  }

  function movePlayer(vector: MoveVector): void {
    const now = performance.now();
    if (now - lastMoveAtRef.current <= 110) return;
    lastMoveAtRef.current = now;
    const player = playerTileRef.current;
    player.x += vector.dx;
    player.z += vector.dz;
    const app = appRef.current;
    const actor = actorsRef.current.get("self");
    if (app && actor) {
      const p = worldIso(player.x, player.z, app.screen.width, app.screen.height);
      actor.baseX = player.x;
      actor.baseZ = player.z;
      actor.root.x = p.x;
      actor.root.y = p.y;
      actor.root.zIndex = Math.round(p.y);
    }
    ensureChunksAroundPlayer(false);
  }

  function tick(app: Application, deltaTime = 1): void {
    let dx = 0;
    let dz = 0;
    const keys = keysRef.current;
    if (keys.has("w") || keys.has("arrowup")) dz += 1;
    if (keys.has("s") || keys.has("arrowdown")) dz -= 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    if (dx || dz) movePlayer({ dx, dz });

    const logicalTick = Math.floor(performance.now() / 100);
    actorsRef.current.forEach((actor, id) => {
      if (actor.player) return;
      const x = actor.baseX + Math.sin((logicalTick + actor.phase) / 35) * 0.26;
      const z = actor.baseZ + Math.cos((logicalTick + actor.phase) / 41) * 0.2;
      const p = worldIso(x, z, app.screen.width, app.screen.height);
      actor.root.x += (p.x - actor.root.x) * Math.min(0.2 * deltaTime, 0.5);
      actor.root.y += (p.y - actor.root.y) * Math.min(0.2 * deltaTime, 0.5);
      actor.root.zIndex = Math.round(actor.root.y);
      if (id.length === 0) actor.root.alpha = 1;
    });

    const world = worldRef.current;
    const self = actorsRef.current.get("self");
    if (world && self) {
      const targetX = app.screen.width / 2 - self.root.x;
      const targetY = app.screen.height / 2 - self.root.y - 18;
      world.x += (targetX - world.x) * Math.min(0.16 * deltaTime, 0.36);
      world.y += (targetY - world.y) * Math.min(0.16 * deltaTime, 0.36);
    }
  }

  useEffect(() => {
    window.__wasd2dMove = movePlayer;
    return () => {
      if (window.__wasd2dMove === movePlayer) delete window.__wasd2dMove;
    };
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => keysRef.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
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
    async function boot() {
      try {
        setPhase("pixi_init");
        document.body.dataset.worldBoot = "pixi_init";
        const app = new Application();
        appRef.current = app;
        await app.init({ backgroundAlpha: 0, resizeTo: host.current!, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) });
        if (cancelled) return;
        host.current?.appendChild(app.canvas);
        const world = new Container();
        const terrain = new Container();
        const actors = new Container();
        world.sortableChildren = true;
        terrain.sortableChildren = true;
        actors.sortableChildren = true;
        worldRef.current = world;
        terrainRef.current = terrain;
        actorLayerRef.current = actors;
        world.addChild(terrain, actors);
        app.stage.sortableChildren = true;
        app.stage.addChild(world);
        placeActor("self", playerTileRef.current.x, playerTileRef.current.z, playerName, true);
        ensureChunksAroundPlayer(true);
        app.ticker.add((ticker) => tick(app, ticker.deltaTime));
        setPhase("world_ready");
        document.body.dataset.worldBoot = "world_ready";
      } catch (err) {
        setPhase("failed");
        setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? "unknown world boot error"));
        document.body.dataset.worldBoot = "failed";
      }
    }
    void boot();
    return () => {
      cancelled = true;
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  }, []);

  const bootState = bootStateFromPhase(phase);
  const emptyVitals = { hp: 100, maxHp: 100, mana: 50, maxMana: 50, stamina: 100, maxStamina: 100, xp: 0, maxXp: 100, level: 1 };

  return (
    <BootSurface bootState={bootState} error={error} diagnosticMessage={phase === "failed" ? "The world renderer failed to initialize. The UI shell is still alive." : undefined}>
      <div className="az-shell" data-testid="deterministic-world-root" data-boot-state={bootState}>
        <div data-testid="world-boot-status" className={`world-boot-status world-boot-status--${phase}`}>
          <strong>Areloria World</strong>
          <span>{phase === "world_ready" ? "World ready" : phase === "pixi_init" ? "Starting Pixi renderer…" : phase === "failed" ? "World boot failed" : "Mounting React world root…"}</span>
          {error && <code>{error}</code>}
        </div>
        <div className="az-world-glow" />
        <div ref={host} className="az-pixi" data-testid="pixi-host" />
        <ResourceNodeMarkerLayer />
        <WorldPoiMarkerLayer />
        <CampNpcMarkerLayer />
        <ArelorianStitchHud
          connected={true}
          assetStatus="DETERMINISTIC_GRAPHICS"
          weaponCount={0}
          equippedWeaponId={null}
          inventoryItems={[]}
          playerName={playerName}
          messages={messages}
          onSkill={(skillId) => setMessages((items) => [...items.slice(-12), { from: "Skill", txt: `Queued ${skillId}.` }])}
          onChat={(text) => setMessages((items) => [...items.slice(-12), { from: playerName, txt: text }])}
          onInteract={() => setMessages((items) => [...items.slice(-12), { from: "World", txt: "Nearest NPC interaction is active in deterministic local runtime." }])}
          onStrike={() => setMessages((items) => [...items.slice(-12), { from: "Combat", txt: "Strike intent queued." }])}
          onCycleWeapon={() => setMessages((items) => [...items.slice(-12), { from: "Inventory", txt: "No weapon atlas loaded in deterministic fallback renderer." }])}
          onToggleAutoMove={() => setMessages((items) => [...items.slice(-12), { from: "Navigator", txt: "Chunk streaming follows player position." }])}
          vitals={emptyVitals}
          debugPlayerPos={debugPlayerPos ?? undefined}
          debugChunkCoords={debugChunkCoords ?? undefined}
          debugVisibleChunks={debugVisibleChunks ?? undefined}
          debugHeartbeatReceived={true}
          debugInitialized={phase === "world_ready"}
          debugNetworkStatus="local-deterministic"
          debugIdentity={playerName}
          debugCharacter="self"
        />
      </div>
    </BootSurface>
  );
}

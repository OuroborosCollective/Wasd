import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { deriveChunkBiome, generateChunkScenePlan } from "@wasd/shared";
import { iso3, TILE_W, TILE_H } from "./isometricProjection";
import { BootSurface, type BootState } from "./ui/BootSurface";

const CHUNK_TILES = 16;
const KAPPA_PER_TILE = 1000;
const VIEW_RADIUS = 2;
const WORLD_SEED_KEY = "wasd:runtime:worldSeed";

type Actor = { root: Container; x: number; z: number; player: boolean; phase: number };
type Move = { dx: number; dz: number };
type FutureRendererPhase = "mounting" | "init" | "ready" | "failed";

export interface FutureRendererRuntimeSnapshot {
  phase: FutureRendererPhase;
  bootState: BootState;
  playerPos: { x: number; z: number };
  chunkCoords: { chunkX: number; chunkZ: number };
  visibleChunks: number;
  initialized: boolean;
  networkStatus: "connected" | "disconnected" | "waiting";
  error: string | null;
}

export interface DeterministicWorldIsoAppFutureProps {
  onRuntimeSnapshot?: (snapshot: FutureRendererRuntimeSnapshot) => void;
}

declare global {
  interface Window {
    __wasd2dMove?: (move: Move) => void;
  }
}

function worldSeed(): string {
  const params = new URLSearchParams(window.location.search);
  const urlSeed = params.get("worldSeed")?.trim();
  const stored = localStorage.getItem(WORLD_SEED_KEY)?.trim();
  const seed = urlSeed || stored || ["runtime", window.location.host || "local", "seed"].join(":");
  localStorage.setItem(WORLD_SEED_KEY, seed);
  return seed;
}

function hash(input: string): number {
  let out = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    out ^= input.charCodeAt(i);
    out = Math.imul(out, 0x01000193) >>> 0;
  }
  return out;
}

function chunkCoord(tile: number): number {
  return Math.floor(tile / CHUNK_TILES);
}

function iso(tileX: number, tileZ: number, width: number, height: number) {
  return iso3({ gridX: tileX, gridZ: tileZ, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
}

function diamond(color: number): Graphics {
  const g = new Graphics();
  g.moveTo(0, -TILE_H / 2);
  g.lineTo(TILE_W / 2, 0);
  g.lineTo(0, TILE_H / 2);
  g.lineTo(-TILE_W / 2, 0);
  g.closePath();
  g.fill(color);
  g.stroke({ width: 1, color: 0x0b1b12, alpha: 0.16 });
  return g;
}

function terrainColor(kind: string): number {
  if (kind === "road_edge") return 0x705333;
  if (kind === "stone") return 0x59615f;
  if (kind === "forest_floor") return 0x345f3e;
  return 0x3f7f48;
}

function makeActor(name: string, player: boolean): Container {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 18, 22, 8).fill({ color: 0x02040a, alpha: 0.56 }));
  c.addChild(new Graphics().roundRect(-12, -32, 24, 38, 6).fill(player ? 0x2f7dff : 0x456b38).stroke({ width: 2, color: player ? 0x00e5ff : 0xf0c36a, alpha: 0.62 }));
  c.addChild(new Graphics().circle(0, -47, 12).fill(0xffd8a9));
  const label = new Text({ text: name, style: { fontSize: 11, fill: 0xfff0cf, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" } });
  label.anchor.set(0.5, 1);
  label.y = -62;
  c.addChild(label);
  return c;
}

function bootState(phase: FutureRendererPhase): BootState {
  if (phase === "ready") return "ready";
  if (phase === "failed") return "error";
  if (phase === "init") return "initializing";
  return "waiting";
}

function chunkKey(cx: number, cz: number): string {
  return `${cx}:${cz}`;
}

export function DeterministicWorldIsoApp({ onRuntimeSnapshot }: DeterministicWorldIsoAppFutureProps = {}) {
  const seed = useRef(worldSeed());
  const host = useRef<HTMLDivElement>(null);
  const app = useRef<Application | null>(null);
  const world = useRef<Container | null>(null);
  const terrain = useRef<Container | null>(null);
  const actorLayer = useRef<Container | null>(null);
  const actors = useRef<Map<string, Actor>>(new Map());
  const chunks = useRef<Set<string>>(new Set());
  const activeVisibleChunks = useRef<Set<string>>(new Set());
  const keys = useRef<Set<string>>(new Set());
  const player = useRef({ x: 8, z: 9 });
  const lastMove = useRef(0);
  const phaseRef = useRef<FutureRendererPhase>("mounting");
  const errorRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<FutureRendererPhase>("mounting");
  const [error, setError] = useState<string | null>(null);
  const [visibleChunkCount, setVisibleChunkCount] = useState(0);

  function makeActiveVisibleChunkKeys(): Set<string> {
    const visible = new Set<string>();
    const centerX = chunkCoord(player.current.x);
    const centerZ = chunkCoord(player.current.z);
    for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz += 1) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx += 1) {
        visible.add(chunkKey(centerX + dx, centerZ + dz));
      }
    }
    return visible;
  }

  function makeRuntimeSnapshot(
    nextPhase = phaseRef.current,
    nextVisibleChunkCount = activeVisibleChunks.current.size,
    nextError = errorRef.current,
  ): FutureRendererRuntimeSnapshot {
    const playerPos = { x: player.current.x, z: player.current.z };
    return {
      phase: nextPhase,
      bootState: bootState(nextPhase),
      playerPos,
      chunkCoords: { chunkX: chunkCoord(playerPos.x), chunkZ: chunkCoord(playerPos.z) },
      visibleChunks: nextVisibleChunkCount,
      initialized: nextPhase === "ready",
      networkStatus: nextPhase === "ready" ? "connected" : nextPhase === "failed" ? "disconnected" : "waiting",
      error: nextError,
    };
  }

  function emitRuntimeSnapshot(
    nextPhase = phaseRef.current,
    nextVisibleChunkCount = activeVisibleChunks.current.size,
    nextError = errorRef.current,
  ): void {
    onRuntimeSnapshot?.(makeRuntimeSnapshot(nextPhase, nextVisibleChunkCount, nextError));
  }

  function setRendererPhase(nextPhase: FutureRendererPhase, nextError = errorRef.current): void {
    phaseRef.current = nextPhase;
    errorRef.current = nextError;
    setPhase(nextPhase);
    setError(nextError);
    emitRuntimeSnapshot(nextPhase, activeVisibleChunks.current.size, nextError);
  }

  function place(id: string, x: number, z: number, name: string, isPlayer: boolean): void {
    const pixi = app.current;
    const layer = actorLayer.current;
    if (!pixi || !layer) return;
    const point = iso(x, z, pixi.screen.width, pixi.screen.height);
    const existing = actors.current.get(id);
    if (existing) {
      existing.x = x;
      existing.z = z;
      existing.root.x = point.x;
      existing.root.y = point.y;
      existing.root.zIndex = Math.round(point.y);
      return;
    }
    const root = makeActor(name, isPlayer);
    root.x = point.x;
    root.y = point.y;
    root.zIndex = Math.round(point.y);
    layer.addChild(root);
    actors.current.set(id, { root, x, z, player: isPlayer, phase: hash(`${id}:${name}`) % 1000 });
  }

  function renderChunk(cx: number, cz: number): void {
    const pixi = app.current;
    const layer = terrain.current;
    if (!pixi || !layer) return;
    const key = chunkKey(cx, cz);
    if (chunks.current.has(key)) return;
    chunks.current.add(key);
    const biomeId = deriveChunkBiome(cx, cz, seed.current);
    const plan = generateChunkScenePlan({ worldSeed: seed.current, chunkX: cx, chunkZ: cz, biomeId, kappa: KAPPA_PER_TILE, chunkTiles: CHUNK_TILES });
    const chunkLayer = new Container();
    chunkLayer.sortableChildren = true;
    layer.addChild(chunkLayer);

    for (const cell of plan.terrain) {
      const p = iso(cx * CHUNK_TILES + cell.tileX, cz * CHUNK_TILES + cell.tileZ, pixi.screen.width, pixi.screen.height);
      const tile = diamond(terrainColor(cell.terrainType));
      tile.x = p.x;
      tile.y = p.y;
      tile.zIndex = Math.round(p.y) - 1000;
      chunkLayer.addChild(tile);
    }

    for (const [roadCell] of Object.entries(plan.roads.roadCells)) {
      const [rx, rz] = roadCell.split(":").map(Number);
      const p = iso(cx * CHUNK_TILES + rx, cz * CHUNK_TILES + rz, pixi.screen.width, pixi.screen.height);
      const road = diamond(0x87633f);
      road.scale.set(0.72, 0.72);
      road.x = p.x;
      road.y = p.y;
      road.zIndex = Math.round(p.y) - 900;
      chunkLayer.addChild(road);
    }

    for (const prop of [...plan.settlement.props, ...plan.props]) {
      const p = iso(cx * CHUNK_TILES + prop.tileX, cz * CHUNK_TILES + prop.tileZ, pixi.screen.width, pixi.screen.height);
      const node = new Graphics().circle(0, -18, prop.propType === "tree" ? 18 : 9).fill(prop.propType === "stone" ? 0x888888 : 0x2f8d4d);
      node.x = p.x;
      node.y = p.y;
      node.zIndex = Math.round(p.y) - 10;
      chunkLayer.addChild(node);
    }

    for (const npc of plan.npcs) place(npc.id, cx * CHUNK_TILES + npc.tileX, cz * CHUNK_TILES + npc.tileZ, npc.role.replace(/_/g, " "), false);
  }

  function streamChunks(): void {
    const visible = makeActiveVisibleChunkKeys();
    for (const key of visible) {
      const [cx, cz] = key.split(":").map(Number);
      renderChunk(cx, cz);
    }
    activeVisibleChunks.current = visible;
    setVisibleChunkCount(visible.size);
    emitRuntimeSnapshot(phaseRef.current, visible.size);
  }

  function move(input: Move): void {
    const now = performance.now();
    if (now - lastMove.current < 110) return;
    lastMove.current = now;
    player.current.x += input.dx;
    player.current.z += input.dz;
    place("self", player.current.x, player.current.z, "Architect", true);
    streamChunks();
  }

  function tick(pixi: Application, delta = 1): void {
    const k = keys.current;
    const dx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    const dz = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    if (dx || dz) move({ dx, dz });
    const logicalTick = Math.floor(performance.now() / 100);
    actors.current.forEach((actor) => {
      if (actor.player) return;
      const p = iso(actor.x + Math.sin((logicalTick + actor.phase) / 35) * 0.26, actor.z + Math.cos((logicalTick + actor.phase) / 41) * 0.2, pixi.screen.width, pixi.screen.height);
      actor.root.x += (p.x - actor.root.x) * Math.min(0.2 * delta, 0.5);
      actor.root.y += (p.y - actor.root.y) * Math.min(0.2 * delta, 0.5);
      actor.root.zIndex = Math.round(actor.root.y);
    });
    const worldRoot = world.current;
    const self = actors.current.get("self");
    if (worldRoot && self) {
      worldRoot.x += (pixi.screen.width / 2 - self.root.x - worldRoot.x) * Math.min(0.16 * delta, 0.36);
      worldRoot.y += (pixi.screen.height / 2 - self.root.y - 18 - worldRoot.y) * Math.min(0.16 * delta, 0.36);
    }
  }

  useEffect(() => {
    emitRuntimeSnapshot();
  }, [onRuntimeSnapshot]);

  useEffect(() => {
    window.__wasd2dMove = move;
    return () => {
      if (window.__wasd2dMove === move) delete window.__wasd2dMove;
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
    if (!host.current || app.current) return;
    let cancelled = false;
    async function boot() {
      try {
        setRendererPhase("init");
        const pixi = new Application();
        app.current = pixi;
        await pixi.init({ backgroundAlpha: 0, resizeTo: host.current!, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) });
        if (cancelled) return;
        host.current?.appendChild(pixi.canvas);
        const worldRoot = new Container();
        const terrainLayer = new Container();
        const actorsLayer = new Container();
        worldRoot.sortableChildren = true;
        terrainLayer.sortableChildren = true;
        actorsLayer.sortableChildren = true;
        world.current = worldRoot;
        terrain.current = terrainLayer;
        actorLayer.current = actorsLayer;
        worldRoot.addChild(terrainLayer, actorsLayer);
        pixi.stage.sortableChildren = true;
        pixi.stage.addChild(worldRoot);
        place("self", player.current.x, player.current.z, "Architect", true);
        streamChunks();
        pixi.ticker.add((ticker) => tick(pixi, ticker.deltaTime));
        setRendererPhase("ready");
      } catch (err) {
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? "unknown world boot error");
        setRendererPhase("failed", message);
      }
    }
    void boot();
    return () => {
      cancelled = true;
      app.current?.destroy(true);
      app.current = null;
    };
  }, []);

  return (
    <BootSurface bootState={bootState(phase)} error={error}>
      <div className="az-shell" data-testid="deterministic-world-root" data-boot-state={bootState(phase)}>
        <div data-testid="world-boot-status" className={`world-boot-status world-boot-status--${phase}`}>
          <strong>Areloria World</strong>
          <span>{phase === "ready" ? `World ready · ${visibleChunkCount} chunks visible` : phase === "failed" ? "World boot failed" : "Starting Pixi renderer…"}</span>
          {error && <code>{error}</code>}
        </div>
        <div className="az-world-glow" />
        <div ref={host} className="az-pixi" data-testid="pixi-host" />
      </div>
    </BootSurface>
  );
}

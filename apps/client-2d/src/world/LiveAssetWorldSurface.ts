import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import {
  DEFAULT_CHUNK_TILES,
  KAPPA_STANDARD,
  deriveChunkBiome,
  generateChunkScenePlan,
} from "@wasd/shared";
import type { AssetEntry, AssetManifest } from "../assetManifest";
import type { BindingOptions } from "./AssetBindingContext";
import { buildAllChunkContexts } from "./AssetBindingContextFactory";
import { createWorldPlanAssetBinder } from "./WorldPlanAssetBinder";

const TILE_W = 64;
const TILE_H = 32;

export interface ServerWorldProjectionDescriptor {
  readonly schemaVersion: "areloria.client2d-world-projection.v1";
  readonly truthClass: "SERVER_SEEDED_STATIC_PRESENTATION";
  readonly gameplayAuthority: false;
  readonly generator: "OuroborosWorldDirectorV1";
  readonly worldSeed: string;
  readonly kappaPerTile: number;
  readonly chunkTiles: number;
  readonly viewRadiusChunks: number;
  readonly serverTick: number;
  readonly worldHash: string | null;
  readonly actorPositionCompatibility: "runtime_world_units_or_kappa";
  readonly source: string;
}

export interface LiveWorldSurfaceStats {
  readonly ready: boolean;
  readonly activeChunks: number;
  readonly resolvedAssets: number;
  readonly missingAssets: number;
  readonly worldSeed: string | null;
  readonly worldHash: string | null;
  readonly generator: string | null;
}

type ChunkRecord = {
  readonly container: Container;
  readonly resolvedAssets: number;
  readonly missingAssets: number;
};

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function canonicalHashOrNull(value: unknown): string | null {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null;
}

export function parseServerWorldProjection(value: unknown): ServerWorldProjectionDescriptor | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== true) return null;
  if (record.schemaVersion !== "areloria.client2d-world-projection.v1") return null;
  if (record.truthClass !== "SERVER_SEEDED_STATIC_PRESENTATION") return null;
  if (record.gameplayAuthority !== false) return null;
  if (record.generator !== "OuroborosWorldDirectorV1") return null;
  if (record.actorPositionCompatibility !== "runtime_world_units_or_kappa") return null;
  const worldSeed = typeof record.worldSeed === "string" ? record.worldSeed.trim() : "";
  const source = typeof record.source === "string" ? record.source.trim() : "";
  const serverTick = Number(record.serverTick);
  if (!worldSeed || !source || !Number.isSafeInteger(serverTick) || serverTick < 0) return null;

  return Object.freeze({
    schemaVersion: "areloria.client2d-world-projection.v1" as const,
    truthClass: "SERVER_SEEDED_STATIC_PRESENTATION" as const,
    gameplayAuthority: false as const,
    generator: "OuroborosWorldDirectorV1" as const,
    worldSeed,
    kappaPerTile: positiveInteger(record.kappaPerTile, KAPPA_STANDARD),
    chunkTiles: positiveInteger(record.chunkTiles, DEFAULT_CHUNK_TILES),
    viewRadiusChunks: Math.min(2, positiveInteger(record.viewRadiusChunks, 1)),
    serverTick,
    worldHash: canonicalHashOrNull(record.worldHash),
    actorPositionCompatibility: "runtime_world_units_or_kappa" as const,
    source,
  });
}

export async function loadServerWorldProjection(
  url = "/health/world-projection",
): Promise<ServerWorldProjectionDescriptor | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return parseServerWorldProjection(await response.json());
  } catch {
    return null;
  }
}

/**
 * The live player bridge historically carried both tile/world-unit positions
 * and kappa-scaled positions. Keep that compatibility explicit while the
 * server migrates all actor coordinates to one unit. Static world generation
 * itself always uses KAPPA_STANDARD / DEFAULT_CHUNK_TILES from @wasd/shared.
 */
export function runtimeWorldCoordinateToTile(value: number, kappaPerTile: number): number {
  if (!Number.isFinite(value)) return 0;
  const kappa = positiveInteger(kappaPerTile, KAPPA_STANDARD);
  return Math.abs(value) > 512 ? value / kappa : value;
}

export function isoTile(tileX: number, tileZ: number): { x: number; y: number } {
  return {
    x: (tileX - tileZ) * (TILE_W / 2),
    y: (tileX + tileZ) * (TILE_H / 2),
  };
}

function entryFrameKey(entry: AssetEntry): string {
  return JSON.stringify({
    src: entry.src,
    frame: entry.frame ?? null,
    sheetFrame: entry.sheetFrame ?? null,
    frameSize: entry.frameSize ?? null,
  });
}

function cropTexture(texture: Texture, entry: AssetEntry): Texture {
  if (entry.frame) {
    return new Texture({
      source: texture.source,
      frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h),
    });
  }

  if (entry.sheetFrame && entry.frameSize) {
    const frameWidth = Math.max(1, Number(entry.frameSize.w));
    const frameHeight = Math.max(1, Number(entry.frameSize.h));
    const columns = Math.max(1, Math.floor(Number(entry.sheetFrame.w) / frameWidth));
    const column = Math.min(columns - 1, Math.floor(columns / 2));
    return new Texture({
      source: texture.source,
      frame: new Rectangle(
        Number(entry.sheetFrame.x) + column * frameWidth,
        Number(entry.sheetFrame.y),
        frameWidth,
        frameHeight,
      ),
    });
  }

  return texture;
}

function cellContext(base: BindingOptions, kind: string, x: number, z: number): BindingOptions {
  return { ...base, seed: `${String(base.seed)}:${kind}:${x}:${z}` };
}

function scalePreservingAspect(sprite: Sprite, targetHeight: number, maxWidth: number): void {
  const textureWidth = Math.max(1, Number(sprite.texture.width));
  const textureHeight = Math.max(1, Number(sprite.texture.height));
  const scale = Math.min(targetHeight / textureHeight, maxWidth / textureWidth);
  sprite.scale.set(Number.isFinite(scale) && scale > 0 ? scale : 1);
}

export class LiveAssetWorldSurface {
  private readonly chunks = new Map<string, ChunkRecord>();
  private readonly textureCache = new Map<string, Promise<Texture | null>>();
  private readonly binder;
  private generation = 0;
  private projection: ServerWorldProjectionDescriptor;
  private lastCenterKey = "";

  constructor(
    private readonly root: Container,
    private readonly manifest: AssetManifest,
    projection: ServerWorldProjectionDescriptor,
  ) {
    this.projection = projection;
    this.root.sortableChildren = true;
    // Binding chooses a real manifest entry synchronously; texture loading stays
    // asynchronous and cached below. No placeholder texture enters production.
    this.binder = createWorldPlanAssetBinder(manifest, () => null, { debug: false });
  }

  updateProjectionEvidence(next: ServerWorldProjectionDescriptor): void {
    if (
      next.worldSeed !== this.projection.worldSeed ||
      next.chunkTiles !== this.projection.chunkTiles ||
      next.kappaPerTile !== this.projection.kappaPerTile ||
      next.generator !== this.projection.generator
    ) {
      this.projection = next;
      this.lastCenterKey = "";
      this.clearChunks();
      return;
    }
    this.projection = next;
  }

  async updateAround(runtimeX: number, runtimeZ: number, serverTick: number): Promise<void> {
    const tileX = runtimeWorldCoordinateToTile(runtimeX, this.projection.kappaPerTile);
    const tileZ = runtimeWorldCoordinateToTile(runtimeZ, this.projection.kappaPerTile);
    const centerChunkX = Math.floor(tileX / this.projection.chunkTiles);
    const centerChunkZ = Math.floor(tileZ / this.projection.chunkTiles);
    const centerKey = `${centerChunkX}:${centerChunkZ}:${this.projection.worldSeed}`;
    if (centerKey === this.lastCenterKey && this.chunks.size > 0) return;
    this.lastCenterKey = centerKey;

    const generation = ++this.generation;
    const needed = new Set<string>();
    const tasks: Promise<void>[] = [];
    for (let dz = -this.projection.viewRadiusChunks; dz <= this.projection.viewRadiusChunks; dz += 1) {
      for (let dx = -this.projection.viewRadiusChunks; dx <= this.projection.viewRadiusChunks; dx += 1) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const key = `${chunkX}_${chunkZ}`;
        needed.add(key);
        if (!this.chunks.has(key)) tasks.push(this.ensureChunk(key, chunkX, chunkZ, serverTick, generation));
      }
    }

    for (const [key, record] of this.chunks) {
      if (needed.has(key)) continue;
      this.root.removeChild(record.container);
      record.container.destroy({ children: true });
      this.chunks.delete(key);
    }

    await Promise.all(tasks);
  }

  getStats(): LiveWorldSurfaceStats {
    let resolvedAssets = 0;
    let missingAssets = 0;
    for (const record of this.chunks.values()) {
      resolvedAssets += record.resolvedAssets;
      missingAssets += record.missingAssets;
    }
    return Object.freeze({
      ready: this.chunks.size > 0 && resolvedAssets > 0,
      activeChunks: this.chunks.size,
      resolvedAssets,
      missingAssets,
      worldSeed: this.projection.worldSeed,
      worldHash: this.projection.worldHash,
      generator: this.projection.generator,
    });
  }

  destroy(): void {
    this.generation += 1;
    this.clearChunks();
    this.textureCache.clear();
  }

  private clearChunks(): void {
    for (const record of this.chunks.values()) {
      this.root.removeChild(record.container);
      record.container.destroy({ children: true });
    }
    this.chunks.clear();
  }

  private async ensureChunk(
    key: string,
    chunkX: number,
    chunkZ: number,
    serverTick: number,
    generation: number,
  ): Promise<void> {
    const record = await this.renderChunk(chunkX, chunkZ, serverTick);
    if (generation !== this.generation || this.chunks.has(key)) {
      record.container.destroy({ children: true });
      return;
    }
    this.chunks.set(key, record);
    this.root.addChild(record.container);
  }

  private async textureFor(entry: AssetEntry | null | undefined): Promise<Texture | null> {
    if (!entry?.src) return null;
    const key = entryFrameKey(entry);
    let pending = this.textureCache.get(key);
    if (!pending) {
      pending = Assets.load<Texture>(entry.src)
        .then((texture) => cropTexture(texture, entry))
        .catch((error) => {
          console.warn("[2D World] asset load failed", entry.id ?? entry.src, error);
          return null;
        });
      this.textureCache.set(key, pending);
    }
    return pending;
  }

  private async renderChunk(chunkX: number, chunkZ: number, serverTick: number): Promise<ChunkRecord> {
    const chunkTiles = this.projection.chunkTiles;
    const biomeId = deriveChunkBiome(chunkX, chunkZ, this.projection.worldSeed);
    const plan = generateChunkScenePlan({
      worldSeed: this.projection.worldSeed,
      chunkX,
      chunkZ,
      biomeId,
      kappa: this.projection.kappaPerTile as typeof KAPPA_STANDARD,
      chunkTiles,
    });
    const contexts = buildAllChunkContexts(
      { chunkX, chunkZ, biomeId },
      { worldTick: Math.max(0, Math.trunc(serverTick)), worldSeed: this.projection.worldSeed },
      plan,
      undefined,
      { forceLod: "medium" },
    );

    const container = new Container();
    container.sortableChildren = true;
    container.label = `world-chunk:${chunkX}:${chunkZ}`;
    const origin = isoTile(chunkX * chunkTiles, chunkZ * chunkTiles);
    container.x = origin.x;
    container.y = origin.y;
    container.zIndex = Math.round(origin.y);

    let resolvedAssets = 0;
    let missingAssets = 0;

    // Terrain is presentation only. Every visible cell must bind a real manifest
    // asset; a missing asset is skipped and counted rather than replaced by a
    // colored demo diamond.
    for (const cell of plan.terrain) {
      const bound = this.binder.bindTerrainWithContext(
        cell.terrainType,
        cellContext(contexts.chunk, "terrain", cell.tileX, cell.tileZ),
      );
      const texture = await this.textureFor(bound.entry);
      if (!texture) {
        missingAssets += 1;
        continue;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = TILE_W;
      sprite.height = TILE_H;
      const pos = isoTile(cell.tileX, cell.tileZ);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.zIndex = Math.round(pos.y - 10000);
      container.addChild(sprite);
      resolvedAssets += 1;
    }

    for (const [roadCell] of Object.entries(plan.roads.roadCells)) {
      const [xRaw, zRaw] = roadCell.split(":");
      const localX = Number(xRaw);
      const localZ = Number(zRaw);
      const roadContext = contexts.roadContexts.get(roadCell) ?? cellContext(contexts.chunk, "road", localX, localZ);
      const bound = this.binder.bindRoadWithContext("dirt_road", roadContext);
      const texture = await this.textureFor(bound.entry);
      if (!texture) {
        missingAssets += 1;
        continue;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = TILE_W;
      sprite.height = TILE_H;
      const pos = isoTile(localX, localZ);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.zIndex = Math.round(pos.y - 5000);
      container.addChild(sprite);
      resolvedAssets += 1;
    }

    for (const lot of plan.settlement.lots) {
      const context = contexts.buildingContexts.get(lot.id) ?? contexts.chunk;
      const bound = this.binder.bindBuildingWithContext(lot.buildingType, context);
      const texture = await this.textureFor(bound.entry);
      if (!texture) {
        missingAssets += 1;
        continue;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      scalePreservingAspect(sprite, 180, 220);
      const pos = isoTile(lot.tileX + lot.widthTiles / 2, lot.tileZ + lot.depthTiles / 2);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.zIndex = Math.round(pos.y);
      container.addChild(sprite);
      resolvedAssets += 1;
    }

    for (const prop of [...plan.settlement.props, ...plan.props]) {
      const context = contexts.propContexts.get(prop.id) ?? contexts.chunk;
      const bound = this.binder.bindPropWithContext(prop.propType, context);
      const texture = await this.textureFor(bound.entry);
      if (!texture) {
        missingAssets += 1;
        continue;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      const targetHeight = prop.propType === "tree" ? 128 : prop.propType === "market_stall" ? 82 : 58;
      const maxWidth = prop.propType === "tree" ? 104 : prop.propType === "market_stall" ? 128 : 72;
      scalePreservingAspect(sprite, targetHeight, maxWidth);
      const pos = isoTile(prop.tileX, prop.tileZ);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.zIndex = Math.round(pos.y + 1);
      container.addChild(sprite);
      resolvedAssets += 1;
    }

    // Intentionally DO NOT render plan.npcs here. Runtime players/NPCs/loot are
    // owned by the authoritative heartbeat and rendered by LiveAuthoritativeWorld2D.
    return Object.freeze({ container, resolvedAssets, missingAssets });
  }
}

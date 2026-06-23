import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { ChunkScenePlan, KappaInt } from "@wasd/shared";
import { deriveChunkBiome, fromKappaInt } from "@wasd/shared";
import { make2dProp, resolveVisualCropPolicy } from "../stackedProps";
import { iso3 } from "../isometricProjection";
import type { BoundAsset, WorldPlanAssetBinder, WorldPlanRenderContext } from "./WorldPlanRenderTypes";
import { buildAllChunkContexts, type ChunkBindingContexts } from "./AssetBindingContextFactory";

const TILE_W = 96;
const TILE_H = 48;
const TERRAIN_Z_INDEX = -1000;

function screenPoint(kappaX: KappaInt, kappaZ: KappaInt, width: number, height: number) {
  return iso3({ gridX: fromKappaInt(kappaX), gridZ: fromKappaInt(kappaZ), screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
}

function place(node: Container, kappaX: KappaInt, kappaZ: KappaInt, width: number, height: number): void {
  const p = screenPoint(kappaX, kappaZ, width, height);
  node.x = p.x;
  node.y = p.y;
  node.zIndex = p.zIndex;
}

function terrainDiamond(kind: string): Graphics {
  const color = kind === "road_edge" ? 0x705333 : kind === "stone" ? 0x59615f : kind === "forest_floor" ? 0x345f3e : 0x3f7f48;
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

function roadDiamond(): Graphics {
  const g = new Graphics();
  g.moveTo(0, -TILE_H / 2 + 8);
  g.lineTo(TILE_W / 2 - 10, 0);
  g.lineTo(0, TILE_H / 2 - 8);
  g.lineTo(-TILE_W / 2 + 10, 0);
  g.closePath();
  g.fill({ color: 0x87633f, alpha: 0.94 });
  g.stroke({ width: 1, color: 0xc79d64, alpha: 0.35 });
  return g;
}

function textureFrame(bound: BoundAsset): Texture | null {
  const texture = bound.texture;
  const entry = bound.entry;
  if (!texture || !entry) return texture ?? null;
  if (entry.frame) return new Texture({ source: texture.source, frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h) });
  if (entry.sheetFrame && entry.frameSize) return new Texture({ source: texture.source, frame: new Rectangle(entry.sheetFrame.x, entry.sheetFrame.y, entry.frameSize.w, entry.frameSize.h) });
  return texture;
}

function tileSprite(bound: BoundAsset, fallback: () => Container): Container {
  const texture = textureFrame(bound);
  if (!texture) return fallback();
  const crop = resolveVisualCropPolicy(bound.visualSignature);
  const sprite = new Sprite(texture);
  sprite.anchor.set(crop.anchorX, crop.anchorY);
  sprite.width = TILE_W + crop.paddingX * 2;
  sprite.height = TILE_H + crop.paddingY * 2;
  sprite.zIndex = TERRAIN_Z_INDEX;
  return sprite;
}

function roadTile(bound: BoundAsset): Container {
  return tileSprite(bound, roadDiamond);
}

function terrainTile(terrainType: string, bound: BoundAsset): Container {
  return tileSprite(bound, () => terrainDiamond(terrainType));
}

function fallbackProp(): Container {
  const c = new Container();
  c.addChild(new Graphics().circle(0, -18, 16).fill(0x2f8d4d));
  return c;
}

function fallbackBuilding(): Container {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 30, 76, 18).fill({ color: 0x030804, alpha: 0.5 }));
  c.addChild(new Graphics().roundRect(-58, -72, 116, 92, 10).fill(0x7d5534));
  const roof = new Graphics();
  roof.moveTo(-72, -68);
  roof.lineTo(0, -128);
  roof.lineTo(72, -68);
  roof.lineTo(52, -42);
  roof.lineTo(-52, -42);
  roof.closePath();
  roof.fill(0x8e2c2b);
  c.addChild(roof);
  return c;
}

interface RenderOptions {
  worldState: { worldTick: number; worldSeed: string };
  biomeId: string;
  lod?: "low" | "medium" | "high";
}

function defaultRenderOptions(plan: ChunkScenePlan): RenderOptions {
  return { biomeId: deriveChunkBiome(plan.input.chunkX, plan.input.chunkZ, plan.input.worldSeed), worldState: { worldSeed: plan.input.worldSeed, worldTick: Number(plan.input.tick ?? 0) }, lod: "medium" };
}

function buildContexts(plan: ChunkScenePlan, options: RenderOptions): ChunkBindingContexts {
  return buildAllChunkContexts(
    { chunkX: plan.input.chunkX, chunkZ: plan.input.chunkZ, biomeId: options.biomeId },
    { worldTick: options.worldState.worldTick, worldSeed: options.worldState.worldSeed },
    plan,
    { settlementTier: plan.settlement.settlementType === "village" ? "village" : "camp", culture: "generic", wealthLevel: "poor", dangerLevel: "protected" },
    { forceLod: options.lod },
  );
}

export function renderChunkScenePlanFixed(plan: ChunkScenePlan, binder: WorldPlanAssetBinder, ctx: WorldPlanRenderContext, options?: RenderOptions): void {
  ctx.terrain.removeChildren();
  ctx.props.removeChildren();
  ctx.actors.removeChildren();

  const renderOptions = options ?? defaultRenderOptions(plan);
  const bindingContexts = buildContexts(plan, renderOptions);

  for (const cell of plan.terrain) {
    const bound = binder.bindTerrainWithContext(cell.terrainType, { seed: `${plan.id}:terrain:${cell.terrainType}:${String(cell.kappaPos.x)}:${String(cell.kappaPos.z)}`, biome: renderOptions.biomeId, lod: renderOptions.lod, variantHint: cell.terrainType });
    const tile = terrainTile(cell.terrainType, bound);
    place(tile, cell.kappaPos.x, cell.kappaPos.z, ctx.width, ctx.height);
    ctx.terrain.addChild(tile);
  }

  for (const [roadCell, roadType] of Object.entries(plan.roads.roadCells)) {
    const [xRaw, zRaw] = roadCell.split(":");
    const roadContext = bindingContexts.roadContexts.get(`${xRaw}:${zRaw}`);
    const bound = roadContext ? binder.bindRoadWithContext(roadType, roadContext) : binder.bindRoad(roadType, `${plan.id}:${roadCell}`);
    const road = roadTile(bound);
    place(road, ((Number(xRaw) * 1000) + 500) as KappaInt, ((Number(zRaw) * 1000) + 500) as KappaInt, ctx.width, ctx.height);
    ctx.terrain.addChild(road);
  }

  for (const lot of plan.settlement.lots) {
    const buildingContext = bindingContexts.buildingContexts.get(lot.id);
    const bound = buildingContext ? binder.bindBuildingWithContext(lot.buildingType, buildingContext) : binder.bindBuilding(lot.buildingType, `${plan.id}:${lot.id}`);
    const building = make2dProp(bound.entry, bound.texture, fallbackBuilding, lot.widthTiles >= 3 ? 220 : 176, lot.depthTiles >= 3 ? 220 : 180, bound.visualSignature);
    place(building, lot.kappaPos.x, lot.kappaPos.z, ctx.width, ctx.height);
    ctx.props.addChild(building);
  }

  for (const prop of [...plan.settlement.props, ...plan.props]) {
    const propContext = bindingContexts.propContexts.get(prop.id);
    const bound = propContext ? binder.bindPropWithContext(prop.propType, propContext) : binder.bindProp(prop.propType, `${plan.id}:${prop.id}`);
    const size = prop.propType === "tree" ? { w: 94, h: 128 } : prop.propType === "market_stall" ? { w: 112, h: 82 } : prop.propType === "well" ? { w: 86, h: 86 } : { w: 54, h: 54 };
    const node = make2dProp(bound.entry, bound.texture, fallbackProp, size.w, size.h, bound.visualSignature);
    place(node, prop.kappaPos.x, prop.kappaPos.z, ctx.width, ctx.height);
    ctx.props.addChild(node);
  }

  ctx.props.sortChildren();

  for (const npc of plan.npcs) {
    const npcContext = bindingContexts.npcContexts.get(npc.id);
    const bound = npcContext ? binder.bindNpcWithContext(npc.role, npcContext) : binder.bindNpc(npc.role, `${plan.id}:${npc.id}`);
    ctx.addNpcActor({ id: npc.id, tileX: npc.tileX, tileZ: npc.tileZ, name: npc.role.replace(/_/g, " "), role: npc.role, characterVisualId: bound.entry?.id ?? null, visualSignature: bound.visualSignature ?? null });
  }
}

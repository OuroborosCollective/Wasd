import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { pickWeaponVisual, type AssetEntry, type AssetManifest } from "./assetManifest";
import { iso3 } from "./isometricProjection";

const TILE_W = 96;
const TILE_H = 48;

type Assets2D = {
  manifest: AssetManifest | null;
  textures: Map<string, Texture>;
  forestTextures: Map<string, Texture>;
};

type ItemVisual = { root: Container };

function frameTexture(assets: Assets2D | null, entry: AssetEntry | null): Texture | null {
  if (!assets || !entry?.src) return null;
  const base = assets.textures.get(entry.src) ?? assets.forestTextures.get(entry.src);
  if (!base) return null;
  if (entry.frame) return new Texture({ source: base.source, frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h) });
  return base;
}

function sprite(texture: Texture) {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  s.width = 44;
  s.height = 44;
  s.y = 6;
  s.rotation = -0.75;
  return s;
}

function fallbackItem() {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 10, 18, 6).fill({ color: 0x020a0c, alpha: 0.55 }));
  c.addChild(new Graphics().circle(0, 0, 9).fill({ color: 0x00e5ff, alpha: 0.82 }).stroke({ width: 2, color: 0xc8fbff, alpha: 0.88 }));
  return c;
}

function createVisual(data: any, assets: Assets2D | null) {
  const item = data?.item ?? data;
  const visualId = item?.weaponVisualId ?? item?.visualId ?? data?.weaponVisualId ?? null;
  const root = new Container();
  root.addChild(new Graphics().ellipse(0, 11, 18, 6).fill({ color: 0x020a0c, alpha: 0.5 }));
  if (item?.type === "weapon" && visualId) {
    const picked = pickWeaponVisual(assets?.manifest ?? null, { visualId, seed: String(data?.id ?? visualId) });
    const tex = frameTexture(assets, picked?.entry ?? null);
    if (tex) {
      root.addChild(sprite(tex));
      return root;
    }
  }
  root.addChild(fallbackItem());
  return root;
}

function place(root: Container, x: number, z: number, width: number, height: number) {
  const p = iso3({ gridX: x, gridZ: z, screenWidth: width, screenHeight: height, tileWidth: TILE_W, tileHeight: TILE_H, height: 0 });
  root.x = p.x;
  root.y = p.y;
  root.zIndex = root.y;
}

export function syncWorldItems(args: { width: number; height: number; layer: Container; visuals: Map<string, ItemVisual>; items: any[]; assets: Assets2D | null }) {
  const seen = new Set<string>();
  for (const data of args.items) {
    const id = String(data?.id ?? data?.item?.id ?? "");
    if (!id) continue;
    seen.add(id);
    const pos = data?.position ?? data;
    const x = Number(pos?.x ?? data?.x ?? 0);
    const z = Number(pos?.z ?? pos?.y ?? data?.z ?? data?.y ?? 0);
    let visual = args.visuals.get(id);
    if (!visual) {
      visual = { root: createVisual(data, args.assets) };
      args.visuals.set(id, visual);
      args.layer.addChild(visual.root);
    }
    place(visual.root, x, z, args.width, args.height);
  }
  for (const [id, visual] of [...args.visuals.entries()]) {
    if (seen.has(id)) continue;
    visual.root.destroy({ children: true });
    args.visuals.delete(id);
  }
  args.layer.sortChildren();
}

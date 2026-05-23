import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { AssetEntry } from "./assetManifest";

export type StackedSpriteOptions = {
  width: number;
  height: number;
  layerStep?: number;
  shadow?: boolean;
};

export function supportsStack(entry: AssetEntry | null | undefined): boolean {
  return Boolean(entry?.spriteLayers?.length);
}

function frameTexture(texture: Texture, frame: { x: number; y: number; w: number; h: number }): Texture {
  return new Texture({ source: texture.source, frame: new Rectangle(frame.x, frame.y, frame.w, frame.h) });
}

function makeSprite(texture: Texture, width: number, height: number, x = 0, y = 0): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 1);
  sprite.width = width;
  sprite.height = height;
  sprite.x = x;
  sprite.y = y;
  return sprite;
}

export function makeStackedSprite(texture: Texture, entry: AssetEntry, options: StackedSpriteOptions): Container {
  const root = new Container();
  const layers = [...(entry.spriteLayers ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const step = Number.isFinite(options.layerStep) ? Number(options.layerStep) : 3;

  if (options.shadow !== false) {
    const shadow = entry.shadow;
    const sw = shadow?.w ?? entry.isoFootprint?.w ?? options.width * 0.72;
    const sh = shadow?.h ?? entry.isoFootprint?.h ?? Math.max(6, options.height * 0.12);
    root.addChild(new Graphics().ellipse(0, 16, sw * 0.5, sh * 0.5).fill({ color: 0x010804, alpha: shadow?.alpha ?? 0.42 }));
  }

  if (layers.length === 0) {
    root.addChild(makeSprite(texture, options.width, options.height));
    return root;
  }

  for (const layer of layers) {
    const tex = frameTexture(texture, layer.frame);
    const z = Number(layer.z ?? 0);
    root.addChild(makeSprite(tex, options.width, options.height, Number(layer.offsetX ?? 0), Number(layer.offsetY ?? 0) - z * step));
  }

  return root;
}

import { Container, Graphics, Texture } from "pixi.js";
import { makeStackedSprite, supportsStack } from "./stackedSprite";
import type { AssetEntry } from "./assetManifest";

export function make2dProp(entry: AssetEntry | null | undefined, texture: Texture | null | undefined, fallback: () => Container, width: number, height: number): Container {
  if (!entry || !texture) return fallback();
  if (supportsStack(entry)) return makeStackedSprite(texture, entry, { width, height, layerStep: 3 });
  const root = new Container();
  const shadow = entry.shadow;
  const shadowWidth = shadow?.w ?? entry.isoFootprint?.w ?? width * 0.72;
  const shadowHeight = shadow?.h ?? entry.isoFootprint?.h ?? Math.max(6, height * 0.12);
  root.addChild(new Graphics().ellipse(0, 16, shadowWidth * 0.5, shadowHeight * 0.5).fill({ color: 0x010804, alpha: shadow?.alpha ?? 0.42 }));
  const sprite = new (await import("pixi.js")).Sprite(texture);
  sprite.anchor.set(0.5, 1);
  sprite.width = width;
  sprite.height = height;
  root.addChild(sprite);
  return root;
}

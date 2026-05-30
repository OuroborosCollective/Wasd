import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { makeStackedSprite, supportsStack } from "./stackedSprite";
import type { AssetEntry } from "./assetManifest";

// PIXI v8 blend modes - MULTIPLY = 2
const MULTIPLY_BLEND = 2;

/**
 * Checks if an entry is from an external ISO pack that may have white matte backgrounds.
 * These sprites should use multiply blending to neutralize white backgrounds.
 */
function isExternalIsoPack(entry: AssetEntry | null | undefined): boolean {
  if (!entry) return false;
  const srcLower = entry.src.toLowerCase();
  const tagsLower = (entry.tags ?? []).map((tag: string) => tag.toLowerCase());

  // Check for external pack indicators
  const externalIndicators = [
    '/client2d-assets/graphicriver-iso/',
    '/2d-assets/graphicriver/',
    'graphicriver',
    'kenney',
    'pipoya',
    'isometric',
    'iso-pack'
  ];

  return externalIndicators.some(indicator => srcLower.includes(indicator)) ||
         tagsLower.some(tag => externalIndicators.some(ind => tag.includes(ind)));
}

function propTextureFor(entry: AssetEntry, texture: Texture): Texture {
  const frame = entry.frame;
  if (!frame) return texture;
  if (![frame.x, frame.y, frame.w, frame.h].every(Number.isFinite)) return texture;
  if (frame.w <= 0 || frame.h <= 0) return texture;

  return new Texture({
    source: texture.source,
    frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
  });
}

export function make2dProp(entry: AssetEntry | null | undefined, texture: Texture | null | undefined, fallback: () => Container, width: number, height: number): Container {
  if (!entry || !texture) return fallback();
  const propTexture = propTextureFor(entry, texture);
  if (supportsStack(entry)) return makeStackedSprite(propTexture, entry, { width, height, layerStep: 3 });
  const root = new Container();
  const shadow = entry.shadow;
  const shadowWidth = shadow?.w ?? entry.isoFootprint?.w ?? width * 0.72;
  const shadowHeight = shadow?.h ?? entry.isoFootprint?.h ?? Math.max(6, height * 0.12);
  root.addChild(new Graphics().ellipse(0, 16, shadowWidth * 0.5, shadowHeight * 0.5).fill({ color: 0x010804, alpha: shadow?.alpha ?? 0.42 }));
  const sprite = new Sprite(propTexture);
  sprite.anchor.set(0.5, 1);
  sprite.width = width;
  sprite.height = height;

  // Apply multiply blend mode for external ISO pack sprites to neutralize white matte backgrounds
  if (isExternalIsoPack(entry)) {
    (sprite as any).blendMode = MULTIPLY_BLEND;
  }

  root.addChild(sprite);
  return root;
}

import { Container, Sprite } from "pixi.js";
import { installWorldItemRuntime } from "./worldItemRuntime";

let installed = false;
const DEPTH_MARK = Symbol("wasdClient2DDepthEnhanced");

function isLargeRenderableSprite(child: any): child is Sprite {
  return child instanceof Sprite && Number(child.width) >= 64 && Number(child.height) >= 86;
}

function cloneDepthSlice(source: Sprite, offset: number, alpha: number): Sprite {
  const slice = new Sprite(source.texture);
  slice.anchor.copyFrom(source.anchor);
  slice.width = source.width;
  slice.height = source.height;
  slice.x = source.x;
  slice.y = source.y + offset;
  slice.rotation = source.rotation;
  slice.skew.copyFrom(source.skew);
  slice.alpha = alpha;
  slice.tint = source.tint;
  slice.blendMode = source.blendMode;
  return slice;
}

function enhanceSpriteDepth(parent: Container, child: any, originalAddChild: typeof Container.prototype.addChild): void {
  if (!isLargeRenderableSprite(child)) return;
  if ((child as any)[DEPTH_MARK]) return;
  (child as any)[DEPTH_MARK] = true;

  const lower = cloneDepthSlice(child, 4, 0.18);
  const middle = cloneDepthSlice(child, 2, 0.26);
  (lower as any)[DEPTH_MARK] = true;
  (middle as any)[DEPTH_MARK] = true;
  originalAddChild.call(parent, lower, middle);
}

export function installClient2DDepthRuntime(): void {
  installWorldItemRuntime();
  if (installed) return;
  installed = true;

  const originalAddChild = Container.prototype.addChild;

  Container.prototype.addChild = function patchedAddChild(this: Container, ...children: any[]) {
    for (const child of children) enhanceSpriteDepth(this, child, originalAddChild);
    const result = originalAddChild.apply(this, children as any);
    if (children.some((child) => typeof child?.zIndex === "number")) {
      this.sortableChildren = true;
      (this as any).sortDirty = true;
    }
    return result;
  } as typeof Container.prototype.addChild;
}

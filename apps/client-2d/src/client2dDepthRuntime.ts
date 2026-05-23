import { Container } from "pixi.js";

let installed = false;

export function installClient2DDepthRuntime(): void {
  if (installed) return;
  installed = true;

  const originalAddChild = Container.prototype.addChild;

  Container.prototype.addChild = function patchedAddChild(this: Container, ...children: any[]) {
    const result = originalAddChild.apply(this, children as any);
    if (children.some((child) => typeof child?.zIndex === "number")) {
      this.sortableChildren = true;
      (this as any).sortDirty = true;
    }
    return result;
  } as typeof Container.prototype.addChild;
}

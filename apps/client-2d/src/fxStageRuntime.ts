import { Application, Container } from "pixi.js";
import { spawnTouchRipple } from "./fxLogic";

type PatchedApplication = Application & {
  __wasd2dFxLayer?: Container;
};

let installed = false;

export function installNativeFxStageRuntime() {
  if (installed) return;
  installed = true;

  const originalInit = Application.prototype.init;
  Application.prototype.init = async function patchedInit(this: PatchedApplication, ...args: Parameters<typeof originalInit>) {
    const result = await originalInit.apply(this, args);
    if (this.__wasd2dFxLayer) return result;

    const fx = new Container();
    fx.sortableChildren = true;
    this.__wasd2dFxLayer = fx;
    this.stage.eventMode = "static";
    this.stage.hitArea = this.screen;
    this.stage.addChild(fx);
    this.stage.on("pointertap", (event) => spawnTouchRipple(fx, { x: event.global.x, y: event.global.y }));

    this.ticker.add(() => {
      if (fx.parent === this.stage && this.stage.children[this.stage.children.length - 1] !== fx) this.stage.addChild(fx);
    });

    return result;
  };
}

import { IEngineBridge } from "../engine/bridge/IEngineBridge";
import { EntityViewModel } from "../engine/bridge/EntityViewModel";

export class EntityViewManager {
  private refs = new Map<string, string>();

  constructor(private readonly engine: IEngineBridge) {}

  upsert(view: EntityViewModel, dt: number = 0.016): void {
    if (!this.refs.has(view.id)) {
      this.engine.createEntity(view);
      this.refs.set(view.id, view.id);
    } else {
      this.engine.updateEntity(view.id, view, dt);
    }
  }

  remove(id: string): void {
    if (this.refs.has(id)) {
      this.engine.destroyEntity(id);
      this.refs.delete(id);
    }
  }
}

export function lerp(current: number, target: number, alpha = 0.15): number {
  return current + (target - current) * alpha;
}

export function lerpVector(current: {x: number, y: number, z: number}, target: {x: number, y: number, z: number}, alpha = 0.15) {
  return {
    x: lerp(current.x, target.x, alpha),
    y: lerp(current.y, target.y, alpha),
    z: lerp(current.z, target.z, alpha)
  };
}

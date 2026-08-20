import type { IEngineBridge } from "../bridge/IEngineBridge";
import type { EntityViewModel } from "../bridge/EntityViewModel";
import {
  resolveStudio3DModelUrl,
  subscribeStudioPresentation,
} from "./StudioPresentationConfig";

type TrackedEntityPresentation = {
  type: string;
  authoritativeModelUrl?: string;
};

/**
 * Presentation-only decorator. It may replace a model URL, but never changes
 * entity IDs, positions, rotations, visibility, actions or any gameplay state.
 */
export class StudioPresentationEngineBridge implements IEngineBridge {
  private readonly tracked = new Map<string, TrackedEntityPresentation>();
  private readonly unsubscribe: () => void;

  constructor(private readonly inner: IEngineBridge) {
    this.unsubscribe = subscribeStudioPresentation(() => this.refreshModels());
  }

  createEntity(model: EntityViewModel): void {
    this.tracked.set(model.id, {
      type: model.type,
      authoritativeModelUrl: model.modelUrl,
    });
    this.inner.createEntity({
      ...model,
      modelUrl: resolveStudio3DModelUrl(model.id, model.type, model.modelUrl),
    });
  }

  updateEntity(id: string, updates: Partial<EntityViewModel>, dt?: number): void {
    const current = this.tracked.get(id) ?? {
      type: String(updates.type ?? "object"),
      authoritativeModelUrl: undefined,
    };
    const next = {
      type: String(updates.type ?? current.type),
      authoritativeModelUrl:
        updates.modelUrl !== undefined ? updates.modelUrl : current.authoritativeModelUrl,
    };
    this.tracked.set(id, next);
    this.inner.updateEntity(
      id,
      {
        ...updates,
        ...(updates.modelUrl !== undefined || updates.type !== undefined
          ? { modelUrl: resolveStudio3DModelUrl(id, next.type, next.authoritativeModelUrl) }
          : {}),
      },
      dt,
    );
  }

  destroyEntity(id: string): void {
    this.tracked.delete(id);
    this.inner.destroyEntity(id);
  }

  setCameraTarget(entityId: string): void { this.inner.setCameraTarget(entityId); }
  loadModel(url: string): Promise<any> { return this.inner.loadModel(url); }
  createChunk(chunk: any): void { this.inner.createChunk(chunk); }
  destroyChunk(id: string): void { this.inner.destroyChunk(id); }
  setNavigationTarget(position: { x: number; y: number; z: number } | null): void { this.inner.setNavigationTarget(position); }
  triggerEntityAction(entityId: string, action: string): void { this.inner.triggerEntityAction(entityId, action); }
  playSound(name: string, options?: { volume?: number; loop?: boolean; position?: { x: number; y: number; z: number } }): void {
    this.inner.playSound(name, options);
  }
  onInput(callback: (input: any) => void): void { this.inner.onInput(callback); }
  update(dt: number): void { this.inner.update(dt); }
  setTerrainHeightFn(fn: ((x: number, z: number) => number) | null): void { this.inner.setTerrainHeightFn?.(fn); }
  setAREMode(mode: string): void { this.inner.setAREMode?.(mode); }
  setAREPolicyConfig(config: {
    cooldownMs?: number;
    lowFpsThreshold?: number;
    stableFpsThreshold?: number;
    lowSampleTrigger?: number;
    stableSampleTrigger?: number;
  }): void { this.inner.setAREPolicyConfig?.(config); }
  pulseScreenShakeAndFlash(): void { this.inner.pulseScreenShakeAndFlash?.(); }

  dispose(): void {
    this.unsubscribe();
    this.tracked.clear();
  }

  private refreshModels(): void {
    for (const [id, tracked] of this.tracked) {
      const modelUrl = resolveStudio3DModelUrl(id, tracked.type, tracked.authoritativeModelUrl);
      if (modelUrl) this.inner.updateEntity(id, { modelUrl });
    }
  }
}

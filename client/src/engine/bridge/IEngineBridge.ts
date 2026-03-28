import { EntityViewModel } from "./EntityViewModel";

export interface IEngineBridge {
  // Entity Management
  createEntity(model: EntityViewModel): void;
  updateEntity(id: string, updates: Partial<EntityViewModel>): void;
  destroyEntity(id: string): void;

  // Camera & View
  setCameraTarget(entityId: string): void;

  // Assets
  loadModel(url: string): Promise<any>;

  // World Streaming
  createChunk(chunk: any): void;
  destroyChunk(id: string): void;

  // Navigation
  setNavigationTarget(position: { x: number, y: number, z: number } | null): void;

  // Actions
  triggerEntityAction(entityId: string, action: string): void;

  // Audio
  playSound(name: string, options?: { volume?: number, loop?: boolean, position?: { x: number, y: number, z: number } }): void;

  // Input
  onInput(callback: (input: any) => void): void;

  // Lifecycle
  update(dt: number): void;
}

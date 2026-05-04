// @ts-nocheck
/**
 * WorldPlacementEvents — Central event bus for the placement pipeline.
 * Every system subscribes here. No direct coupling between services.
 */

export type WorldPlacementEvent =
  | { type: "onAssetImported"; assetId: string; category: string; assetPath: string }
  | { type: "onPlacementProposed"; assetId: string; position: { x: number; y: number }; category: string }
  | { type: "onPlacementValidated"; assetId: string; position: { x: number; y: number } }
  | { type: "onPlacementCorrected"; assetId: string; original: any; corrected: any; reason: string }
  | { type: "onPlacementRejected"; assetId: string; reason: string; position: { x: number; y: number } }
  | { type: "onTerrainPatched"; regionId: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }
  | { type: "onVegetationExclusionChanged"; regionId: string; excluded: boolean; bounds: { x: number; y: number; radius: number } }
  | { type: "onNavRegionDirty"; regionId: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }
  | { type: "onChunkRegistrationChanged"; chunkId: string; action: "load" | "unload" }
  | { type: "onColliderUpdated"; assetId: string; colliderType: string }
  | { type: "onAssetRemoved"; assetId: string; category: string; position: { x: number; y: number } };

type EventHandler = (event: WorldPlacementEvent) => void | Promise<void>;

class WorldPlacementEventBus {
  private handlers = new Map<string, EventHandler[]>();
  private history: WorldPlacementEvent[] = [];
  private maxHistory = 500;

  on(type: WorldPlacementEvent["type"], handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
    return () => {
      const arr = this.handlers.get(type);
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  async emit(event: WorldPlacementEvent): Promise<void> {
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.handlers.get(event.type) ?? [];
    for (const h of handlers) {
      try {
        await h(event);
      } catch (err) {
        console.error(`[WorldEvents] Handler error for ${event.type}:`, err);
      }
    }
  }

  getHistory(filter?: WorldPlacementEvent["type"]): WorldPlacementEvent[] {
    if (!filter) return [...this.history];
    return this.history.filter((e) => e.type === filter);
  }

  clear(): void {
    this.handlers.clear();
    this.history = [];
  }
}

export const worldEvents = new WorldPlacementEventBus();

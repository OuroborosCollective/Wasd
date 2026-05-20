import { worldStateRegistry } from '../../core/state/WorldStateRegistry.js';

export class WorldState {
  snapshot(data:any){
    return {
      // Use deterministic tick-derived timestamp instead of wall-clock.
      capturedAt: Number(worldStateRegistry.getTick() * 100n),
      data
    };
  }
}
import { worldStateRegistry } from '../../core/state/WorldStateRegistry.js';

export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      // Use deterministic tick-derived timestamp instead of wall-clock.
      activatedAt: Number(worldStateRegistry.getTick() * 100n)
    };
  }
}
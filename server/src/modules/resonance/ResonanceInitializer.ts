/**
 * ResonanceInitializer.ts
 *
 * Bootstraps the Shadow-Echo Resonance feature.
 */

import { HeuristicWorldBrain } from '../brain/HeuristicWorldBrain';
import { NPCMemoryCache } from '../npc/NPCMemoryCache';
import { BrainResonanceBridge } from '../brain/BrainResonanceBridge';
import { NPCShadowMemoryBridge } from '../npc/NPCShadowMemoryBridge';

export class ResonanceInitializer {
  static bootstrap(worldBrain: HeuristicWorldBrain, memoryCache: NPCMemoryCache): void {
    console.log('[Resonance] Bootstrapping Shadow-Echo Resonance feature...');

    // Initialize Brain Bridge
    BrainResonanceBridge.initialize(worldBrain);

    // Initialize NPC Memory Bridge
    NPCShadowMemoryBridge.initialize(memoryCache);

    console.log('[Resonance] Feature bridges initialized.');
  }
}

/**
 * Runtime World State Providers
 *
 * Real-world state providers that pull from actual game systems.
 * These are registered with WorldTickThinShell to provide the
 * ARE truth path with real runtime data.
 *
 * ARE Determinism:
 * - All providers return deterministic data from the game state
 * - No Date.now() or Math.random() in provider implementations
 * - Providers use stable entity keys for deterministic ordering
 */

import type { TickSystemContext } from "./TickSystem.js";
import type { WorldStateProvider, WorldStateProviderSlice } from "./WorldTickThinShell.js";
import type { NPCSystem } from "../../modules/npc/NPCSystem.js";
import type { RuntimePlayerSystem } from "./RuntimeDomainPorts.js";
import type { LootDirector } from "../../modules/world/LootDirector.js";

/**
 * NPC World State Provider
 * Provides NPCs from the NPCSystem
 */
export class NPCWorldStateProvider implements WorldStateProvider {
  readonly id = "npc-system";

  constructor(private readonly npcSystem: NPCSystem) {}

  getWorldState(_context: TickSystemContext): WorldStateProviderSlice {
    return {
      npcs: this.npcSystem.getAllNPCs(),
    };
  }
}

/**
 * Player World State Provider
 * Provides Players from the RuntimePlayerSystem
 */
export class PlayerWorldStateProvider implements WorldStateProvider {
  readonly id = "player-system";

  constructor(private readonly playerSystem: RuntimePlayerSystem) {}

  getWorldState(_context: TickSystemContext): WorldStateProviderSlice {
    return {
      players: this.playerSystem.getAllPlayers(),
    };
  }
}

/**
 * Loot World State Provider
 * Provides Loot entities from the LootDirector
 */
export class LootWorldStateProvider implements WorldStateProvider {
  readonly id = "loot-system";

  constructor(private readonly lootDirector: LootDirector) {}

  getWorldState(_context: TickSystemContext): WorldStateProviderSlice {
    return {
      loot: this.lootDirector.getAllLoot(),
    };
  }
}

/**
 * Composite World State Provider
 * Combines multiple providers into one
 */
export class CompositeWorldStateProvider implements WorldStateProvider {
  readonly id: string;

  constructor(
    id: string,
    private readonly providers: WorldStateProvider[],
  ) {
    this.id = id;
  }

  getWorldState(context: TickSystemContext): WorldStateProviderSlice {
    const merged: WorldStateProviderSlice = {};

    for (const provider of this.providers) {
      const slice = provider.getWorldState(context);

      if (slice.npcs) merged.npcs = [...(merged.npcs ?? []), ...slice.npcs];
      if (slice.players) merged.players = [...(merged.players ?? []), ...slice.players];
      if (slice.loot) merged.loot = [...(merged.loot ?? []), ...slice.loot];
      if (slice.warfronts) merged.warfronts = [...(merged.warfronts ?? []), ...slice.warfronts];
      if (slice.economy) merged.economy = [...(merged.economy ?? []), ...slice.economy];
      if (slice.factions) merged.factions = [...(merged.factions ?? []), ...slice.factions];
      if (slice.quests) merged.quests = [...(merged.quests ?? []), ...slice.quests];
      if (slice.worldEvents) merged.worldEvents = [...(merged.worldEvents ?? []), ...slice.worldEvents];
    }

    return merged;
  }
}

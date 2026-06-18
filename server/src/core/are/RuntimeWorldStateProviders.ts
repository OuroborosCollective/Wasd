/**
 * Runtime World State Providers
 *
 * Real-world state providers that pull from actual game systems.
 * These are registered with WorldTickThinShell to provide the
 * ARE truth path with real runtime data.
 *
 * ARE Determinism:
 * - All providers return deterministic data from the game state
 * - Providers must not read wall-clock time or entropy in truth-path code
 * - Providers use stable entity keys for deterministic ordering
 */

import type { TickSystemContext } from "./TickSystem.js";
import type { WorldStateProvider, WorldStateProviderSlice } from "./WorldTickThinShell.js";
import type { NPCSystem } from "../../modules/npc/NPCSystem.js";
import type { RuntimePlayerSystem } from "./RuntimeDomainPorts.js";
import type { LootDirector } from "../../modules/world/LootDirector.js";

type AuthoritySliceKey = keyof WorldStateProviderSlice;

type MutableWorldStateProviderSlice = {
  [K in AuthoritySliceKey]?: unknown[];
};

export interface RuntimeAuthorityListPort {
  getAll(): readonly unknown[];
}

export interface RuntimeAuthoritySlicePort {
  getWorldState(context: TickSystemContext): WorldStateProviderSlice;
}

export interface GameplayAuthorityPorts {
  inventory?: RuntimeAuthorityListPort;
  equipment?: RuntimeAuthorityListPort;
  resources?: RuntimeAuthorityListPort;
  economy?: RuntimeAuthorityListPort;
  quests?: RuntimeAuthorityListPort;
  housing?: RuntimeAuthorityListPort;
  kingdoms?: RuntimeAuthorityListPort;
  population?: RuntimeAuthorityListPort;
  help?: RuntimeAuthorityListPort;
  factions?: RuntimeAuthorityListPort;
  warfronts?: RuntimeAuthorityListPort;
  worldEvents?: RuntimeAuthorityListPort;
}

function appendSliceField(
  target: MutableWorldStateProviderSlice,
  key: AuthoritySliceKey,
  source: readonly unknown[] | undefined,
): void {
  if (!source || source.length === 0) return;
  target[key] = [...(target[key] ?? []), ...source];
}

function sliceFromPort(
  port: RuntimeAuthorityListPort | undefined,
): readonly unknown[] | undefined {
  if (!port) return undefined;
  const value = port.getAll();
  return Array.isArray(value) ? value : undefined;
}

function freezeSlice(slice: MutableWorldStateProviderSlice): WorldStateProviderSlice {
  return Object.freeze(slice);
}

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
 * Generic runtime source provider for one ARE authority slice.
 *
 * This is intentionally a real-source adapter only. It cannot fabricate fallback
 * gameplay data because the constructor requires a port that exposes live runtime
 * lists and the getter returns nothing when the port returns a non-array value.
 */
export class RuntimeAuthorityListProvider implements WorldStateProvider {
  readonly id: string;

  constructor(
    id: string,
    private readonly key: AuthoritySliceKey,
    private readonly port: RuntimeAuthorityListPort,
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error("RuntimeAuthorityListProvider requires a stable non-empty id");
    }
    this.id = id;
  }

  getWorldState(_context: TickSystemContext): WorldStateProviderSlice {
    const values = sliceFromPort(this.port);
    if (!values) return {};

    const slice: MutableWorldStateProviderSlice = {};
    appendSliceField(slice, this.key, values);
    return freezeSlice(slice);
  }
}

/**
 * Gameplay authority provider for release-critical systems that already expose
 * deterministic runtime list ports: inventory, equipment, resource nodes,
 * economy, quests, housing, kingdoms, population and help hints.
 */
export class GameplayAuthorityWorldStateProvider implements WorldStateProvider {
  readonly id = "gameplay-authority";

  constructor(private readonly ports: GameplayAuthorityPorts) {}

  getWorldState(_context: TickSystemContext): WorldStateProviderSlice {
    const slice: MutableWorldStateProviderSlice = {};

    appendSliceField(slice, "inventory", sliceFromPort(this.ports.inventory));
    appendSliceField(slice, "equipment", sliceFromPort(this.ports.equipment));
    appendSliceField(slice, "resources", sliceFromPort(this.ports.resources));
    appendSliceField(slice, "economy", sliceFromPort(this.ports.economy));
    appendSliceField(slice, "quests", sliceFromPort(this.ports.quests));
    appendSliceField(slice, "housing", sliceFromPort(this.ports.housing));
    appendSliceField(slice, "kingdoms", sliceFromPort(this.ports.kingdoms));
    appendSliceField(slice, "population", sliceFromPort(this.ports.population));
    appendSliceField(slice, "help", sliceFromPort(this.ports.help));
    appendSliceField(slice, "factions", sliceFromPort(this.ports.factions));
    appendSliceField(slice, "warfronts", sliceFromPort(this.ports.warfronts));
    appendSliceField(slice, "worldEvents", sliceFromPort(this.ports.worldEvents));

    return freezeSlice(slice);
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
    const merged: MutableWorldStateProviderSlice = {};

    for (const provider of this.providers) {
      const slice = provider.getWorldState(context);

      appendSliceField(merged, "npcs", slice.npcs);
      appendSliceField(merged, "players", slice.players);
      appendSliceField(merged, "loot", slice.loot);
      appendSliceField(merged, "inventory", slice.inventory);
      appendSliceField(merged, "equipment", slice.equipment);
      appendSliceField(merged, "resources", slice.resources);
      appendSliceField(merged, "warfronts", slice.warfronts);
      appendSliceField(merged, "economy", slice.economy);
      appendSliceField(merged, "factions", slice.factions);
      appendSliceField(merged, "quests", slice.quests);
      appendSliceField(merged, "housing", slice.housing);
      appendSliceField(merged, "kingdoms", slice.kingdoms);
      appendSliceField(merged, "population", slice.population);
      appendSliceField(merged, "help", slice.help);
      appendSliceField(merged, "worldEvents", slice.worldEvents);
    }

    return freezeSlice(merged);
  }
}

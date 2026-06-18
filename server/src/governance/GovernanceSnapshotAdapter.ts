import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type {
  GovernanceSnapshot,
  GovernanceSnapshotTerritory,
} from "./GovernanceTypes.js";
import { GovernanceService } from "./GovernanceService.js";

function hashHex(parts: readonly unknown[]): string {
  const seed = parts.map((part) => String(part)).join("|");
  return stableHash32(seed).toString(16).padStart(8, "0");
}

export class GovernanceSnapshotAdapter {
  constructor(private readonly service: GovernanceService = new GovernanceService()) {}

  composeSnapshot(tick: number): GovernanceSnapshot {
    const safeTick = Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
    const territories = this.service
      .getRegistry()
      .getTerritories()
      .map((territory): GovernanceSnapshotTerritory => {
        const state = this.service.getState(territory.territoryId);
        if (!state) {
          throw new Error(
            `[GovernanceSnapshotAdapter] missing state for ${territory.territoryId}`,
          );
        }

        return Object.freeze({
          territoryId: territory.territoryId,
          kind: territory.kind,
          title: territory.title,
          regionId: territory.regionId,
          chunkKey: territory.chunkKey,
          state,
          conflictPressure: this.service.calculateConflictPressure(
            territory.territoryId,
            safeTick,
          ),
          ...(territory.parentId ? { parentId: territory.parentId } : {}),
          ...(territory.guildId ? { guildId: territory.guildId } : {}),
        });
      })
      .sort((a, b) => a.territoryId.localeCompare(b.territoryId));

    const snapshotHash = hashHex(
      territories.flatMap((territory) => [
        territory.territoryId,
        territory.state.version,
        territory.state.lastActionTick,
        territory.conflictPressure.stateHash,
      ]),
    );

    return Object.freeze({
      tick: safeTick,
      snapshotHash,
      territories: Object.freeze(territories),
    });
  }
}

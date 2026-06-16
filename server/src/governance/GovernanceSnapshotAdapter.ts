import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { GovernanceSnapshot } from "./GovernanceTypes.js";
import { GovernanceService } from "./GovernanceService.js";

function hashHex(parts: readonly unknown[]): string {
  return stableHash32(parts.map((part) => String(part)).join("|")).toString(16).padStart(8, "0");
}

export class GovernanceSnapshotAdapter {
  constructor(private readonly service: GovernanceService = new GovernanceService()) {}

  composeSnapshot(tick: number): GovernanceSnapshot {
    const safeTick = Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
    const territories = this.service.getRegistry().getTerritories().map((territory) => {
      const state = this.service.getState(territory.territoryId);
      if (!state) throw new Error(`[GovernanceSnapshotAdapter] missing state for ${territory.territoryId}`);
      return Object.freeze({
        territoryId: territory.territoryId,
        kind: territory.kind,
        title: territory.title,
        parentId: territory.parentId,
        regionId: territory.regionId,
        chunkKey: territory.chunkKey,
        guildId: territory.guildId,
        state,
        conflictPressure: this.service.calculateConflictPressure(territory.territoryId, safeTick),
      });
    }).sort((a, b) => a.territoryId.localeCompare(b.territoryId));
    const snapshotHash = hashHex(territories.flatMap((territory) => [territory.territoryId, territory.state.version, territory.state.lastActionTick, territory.conflictPressure.stateHash]));
    return Object.freeze({ tick: safeTick, snapshotHash, territories: Object.freeze(territories) });
  }
}

import type { GovernanceSnapshot } from "./GovernanceTypes.js";
import { GovernanceService, type GovernancePressureAdapter } from "./GovernanceService.js";
import { GovernanceSnapshotAdapter } from "./GovernanceSnapshotAdapter.js";
import { TerritoryRegistry } from "./TerritoryRegistry.js";

export class GovernanceTickSystem {
  private readonly service: GovernanceService;
  private readonly snapshotAdapter: GovernanceSnapshotAdapter;
  private currentTick = 0;

  constructor(
    registry: TerritoryRegistry = new TerritoryRegistry(),
    adapter?: GovernancePressureAdapter,
  ) {
    this.service = new GovernanceService(registry, adapter);
    this.snapshotAdapter = new GovernanceSnapshotAdapter(this.service);
  }

  getGovernanceService(): GovernanceService {
    return this.service;
  }

  tick(tick: number): GovernanceSnapshot {
    const validTick = Number.isSafeInteger(tick) && tick >= 0;
    this.currentTick = validTick ? tick : this.currentTick;
    return this.snapshotAdapter.composeSnapshot(this.currentTick);
  }
}

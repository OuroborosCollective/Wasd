import type { GovernanceSnapshot } from "./GovernanceTypes.js";
import { GovernanceService, type GovernancePressureAdapter } from "./GovernanceService.js";
import { GovernanceSnapshotAdapter } from "./GovernanceSnapshotAdapter.js";
import { TerritoryRegistry } from "./TerritoryRegistry.js";

export class GovernanceTickSystem {
  private readonly service: GovernanceService;
  private readonly snapshotAdapter: GovernanceSnapshotAdapter;
  private currentTick = 0;

  constructor(registry: TerritoryRegistry = new TerritoryRegistry(), pressureAdapter?: GovernancePressureAdapter) {
    this.service = new GovernanceService(registry, pressureAdapter);
    this.snapshotAdapter = new GovernanceSnapshotAdapter(this.service);
  }

  getGovernanceService(): GovernanceService {
    return this.service;
  }

  tick(tick: number): GovernanceSnapshot {
    this.currentTick = Number.isSafeInteger(tick) && tick >= 0 ? tick : this.currentTick;
    return this.snapshotAdapter.composeSnapshot(this.currentTick);
  }
}

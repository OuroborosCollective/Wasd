export type TerritoryKind = "kingdom" | "province" | "settlement" | "guild_overlay";
export type ConflictState = "peace" | "tension" | "open_conflict";

export interface GovernanceBudgetDefinition {
  readonly resourceBudget: number;
  readonly guardBudget: number;
  readonly militiaPool: number;
}

export interface TerritoryDefinition {
  readonly territoryId: string;
  readonly kind: TerritoryKind;
  readonly title: string;
  readonly parentId?: string;
  readonly regionId: string;
  readonly chunkKey: string;
  readonly guildId?: string;
  readonly defaultTaxRatePerMille: number;
  readonly defaultLawFlags: readonly string[];
  readonly defaultBudgets: GovernanceBudgetDefinition;
  readonly defaultConflictState: ConflictState;
}

export interface LawDefinition {
  readonly lawFlag: string;
  readonly title: string;
  readonly defaultEnabled: boolean;
}

export interface GovernanceContent {
  readonly territories: readonly TerritoryDefinition[];
  readonly laws: readonly LawDefinition[];
}

export interface GovernanceState {
  readonly territoryId: string;
  readonly taxRatePerMille: number;
  readonly lawFlags: Readonly<Record<string, boolean>>;
  readonly resourceBudget: number;
  readonly guardBudget: number;
  readonly militiaPool: number;
  readonly conflictState: ConflictState;
  readonly version: number;
  readonly lastActionTick: number;
}

export interface GovernanceActor {
  readonly actorId: string;
  readonly role: "server" | "king" | "steward" | "guild_master";
  readonly territoryIds?: readonly string[];
}

export type GovernanceAction =
  | {
      readonly type: "setTaxRate";
      readonly territoryId: string;
      readonly taxRatePerMille: number;
    }
  | {
      readonly type: "setLawFlag";
      readonly territoryId: string;
      readonly lawFlag: string;
      readonly enabled: boolean;
    }
  | {
      readonly type: "assignGuardBudget";
      readonly territoryId: string;
      readonly resourceBudget: number;
      readonly guardBudget: number;
      readonly militiaPool: number;
    }
  | {
      readonly type: "declareConflictState";
      readonly territoryId: string;
      readonly conflictState: ConflictState;
    };

export interface GovernanceActionContext {
  readonly actor: GovernanceActor;
  readonly tick: number;
}

export type GovernanceRejectReason =
  | "invalid_actor"
  | "forbidden_actor"
  | "invalid_tick"
  | "unknown_territory"
  | "unknown_law"
  | "invalid_tax_rate"
  | "invalid_budget"
  | "invalid_conflict_state";

export interface GovernanceActionResult {
  readonly ok: boolean;
  readonly reason: "applied" | GovernanceRejectReason;
  readonly territoryId?: string;
  readonly stateHash: string;
  readonly version?: number;
}

export interface ConflictPressureOutput {
  readonly territoryId: string;
  readonly conflictState: ConflictState;
  readonly pressurePerMille: number;
  readonly economyPressurePerMille: number;
  readonly resourcePressurePerMille: number;
  readonly guardPressurePerMille: number;
  readonly stateHash: string;
}

export interface GovernanceSnapshotTerritory {
  readonly territoryId: string;
  readonly kind: TerritoryKind;
  readonly title: string;
  readonly parentId?: string;
  readonly regionId: string;
  readonly chunkKey: string;
  readonly guildId?: string;
  readonly state: GovernanceState;
  readonly conflictPressure: ConflictPressureOutput;
}

export interface GovernanceSnapshot {
  readonly tick: number;
  readonly snapshotHash: string;
  readonly territories: readonly GovernanceSnapshotTerritory[];
}

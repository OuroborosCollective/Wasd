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

export type GovernanceActionKind =
  | "setTaxRate"
  | "setLawFlag"
  | "assignGuardBudget"
  | "declareConflictState";

export interface GovernanceActionBase {
  readonly actionId: string;
  readonly kind: GovernanceActionKind;
  readonly actorId: string;
  readonly territoryId: string;
  readonly tick: number;
}

export type GovernanceAction =
  | (GovernanceActionBase & {
      readonly type: "setTaxRate";
      readonly kind: "setTaxRate";
      readonly taxRatePerMille: number;
    })
  | (GovernanceActionBase & {
      readonly type: "setLawFlag";
      readonly kind: "setLawFlag";
      readonly lawFlag: string;
      readonly enabled: boolean;
    })
  | (GovernanceActionBase & {
      readonly type: "assignGuardBudget";
      readonly kind: "assignGuardBudget";
      readonly resourceBudget: number;
      readonly guardBudget: number;
      readonly militiaPool: number;
    })
  | (GovernanceActionBase & {
      readonly type: "declareConflictState";
      readonly kind: "declareConflictState";
      readonly conflictState: ConflictState;
    });

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

export interface GovernanceActionDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly sideChannel?: boolean;
}

export interface GovernanceActionEvaluation {
  readonly actionId: string;
  readonly kind: GovernanceActionKind;
  readonly status: string;
  readonly supported: boolean;
  readonly mutatesState: boolean;
  readonly diagnostics: readonly GovernanceActionDiagnostic[];
  readonly evaluationHash: string;
}

export type TerritoryLayer =
  | "kingdom"
  | "province_or_region"
  | "settlement"
  | "village_or_city"
  | "guild_or_faction_overlay";

export interface TerritoryKey {
  readonly id: string;
  readonly layer: TerritoryLayer;
  readonly parentId?: string;
  readonly chunkKey?: string;
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

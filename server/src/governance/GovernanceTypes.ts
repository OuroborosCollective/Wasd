export type TerritoryLayer =
  | "kingdom"
  | "province_or_region"
  | "settlement"
  | "village_or_city"
  | "guild_or_faction_overlay";

export type GovernanceActionKind =
  | "raise_tax"
  | "change_law_flag"
  | "assign_guard_budget"
  | "declare_war"
  | "appoint_officer"
  | "change_trade_policy";

export type GovernanceActionStatus =
  | "unsupported_action"
  | "rejected"
  | "validated_no_mutation";

export interface TerritoryKey {
  readonly id: string;
  readonly layer: TerritoryLayer;
  readonly parentId?: string;
  readonly chunkKey?: string;
}

export interface GovernanceAction {
  readonly actionId: string;
  readonly kind: GovernanceActionKind;
  readonly actorId: string;
  readonly territoryId: string;
  readonly tick: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface GovernanceActionDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly sideChannel: true;
}

export interface GovernanceActionEvaluation {
  readonly actionId: string;
  readonly kind: GovernanceActionKind;
  readonly status: GovernanceActionStatus;
  readonly supported: boolean;
  readonly mutatesState: false;
  readonly diagnostics: readonly GovernanceActionDiagnostic[];
  readonly evaluationHash: string;
}

export interface LawFlagDefinition {
  readonly id: string;
  readonly description: string;
  readonly defaultEnabled: boolean;
}

export interface GovernanceContentPack {
  readonly schemaVersion: 1;
  readonly lawFlags: readonly LawFlagDefinition[];
}

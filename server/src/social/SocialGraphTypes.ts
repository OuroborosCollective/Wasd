export type SocialRelationKind =
  | "ally"
  | "rival"
  | "mentor"
  | "apprentice"
  | "trade_partner"
  | "guildmate"
  | "reputation_source";

export interface SocialGraphNode {
  readonly id: string;
  readonly kind: "player" | "npc" | "guild" | "faction" | "settlement";
}

export interface SocialGraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly relation: SocialRelationKind;
  readonly weightKappa: number;
  readonly lastObservedTick: number;
  readonly sourceEventId: string;
}

export interface ReputationContract {
  readonly subjectId: string;
  readonly scopeId: string;
  readonly scoreKappa: number;
  readonly sourceEventIds: readonly string[];
  readonly updatedTick: number;
}

export interface SocialGraphContract {
  readonly schemaVersion: 1;
  readonly nodes: readonly SocialGraphNode[];
  readonly edges: readonly SocialGraphEdge[];
  readonly reputation: readonly ReputationContract[];
}

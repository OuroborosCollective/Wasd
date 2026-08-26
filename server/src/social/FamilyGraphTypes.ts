export type FamilyRelationKind =
  | "parent"
  | "child"
  | "sibling"
  | "partner"
  | "ancestor"
  | "descendant"
  | "house_member";

export interface FamilyGraphPerson {
  readonly id: string;
  readonly kind: "player" | "npc";
  readonly houseId?: string;
}

export interface FamilyGraphRelation {
  readonly fromId: string;
  readonly toId: string;
  readonly relation: FamilyRelationKind;
  readonly sourceEventId: string;
  readonly observedTick: number;
}

export interface FamilyHouseContract {
  readonly houseId: string;
  readonly founderId?: string;
  readonly settlementId?: string;
  readonly memberIds: readonly string[];
  readonly sourceEventIds: readonly string[];
}

export interface FamilyGraphContract {
  readonly schemaVersion: 1;
  readonly persons: readonly FamilyGraphPerson[];
  readonly relations: readonly FamilyGraphRelation[];
  readonly houses: readonly FamilyHouseContract[];
}

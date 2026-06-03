/**
 * Phase 7: Server Identity Types
 * 
 * Core types for stable identity, ownership, and character management.
 */

export type IdentityKind = "guest" | "account";

export interface StableIdentity {
  identityId: string;
  kind: IdentityKind;
  stableGuestId?: string;
  accountId?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CharacterRecord {
  id: string;
  ownerIdentityId: string;
  playerId: string;
  name: string;
  sceneId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SessionTokenRecord {
  token: string;
  identityId: string;
  playerId: string;
  characterId?: string;
  expiresAtMs: number;
  createdAtMs: number;
}

export interface IdentityResolution {
  identity: StableIdentity;
  character: CharacterRecord;
  sessionToken: string;
  resumed: boolean;
}

export interface IdentityStatus {
  enabled: boolean;
  mode: "memory" | "database";
  healthy: boolean;
  reason?: string;
}
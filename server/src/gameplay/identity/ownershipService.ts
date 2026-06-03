/**
 * Phase 7: Ownership Service
 * 
 * Validates that a session owns the player/character it's trying to control.
 */

import type { GameplaySession } from "../gameplaySession.js";

export interface OwnershipService {
  canControlPlayer(session: GameplaySession, playerId: string): boolean;
  canUseEntityAsLocalPlayer(session: GameplaySession, entityId: string): boolean;
}

export function createOwnershipService(): OwnershipService {
  return {
    canControlPlayer(session, playerId) {
      return session.playerId === playerId;
    },

    canUseEntityAsLocalPlayer(session, entityId) {
      return session.playerId === entityId;
    }
  };
}
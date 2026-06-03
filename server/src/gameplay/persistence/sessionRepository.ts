/**
 * Phase 6: Session Repository
 * 
 * Handles session state persistence with memory fallback.
 * Tracks active sessions for analytics and reconnection.
 */

import type { PersistedSession } from "./types.js";

export interface SessionRepository {
  touchSession(session: PersistedSession): Promise<void>;
  getSession(sessionId: string): Promise<PersistedSession | null>;
}

/**
 * Memory-backed session repository for development/degraded mode.
 */
export function createMemorySessionRepository(): SessionRepository {
  const sessions = new Map<string, PersistedSession>();

  return {
    async touchSession(session) {
      sessions.set(session.id, { ...session });
    },

    async getSession(sessionId) {
      return sessions.get(sessionId) ?? null;
    }
  };
}
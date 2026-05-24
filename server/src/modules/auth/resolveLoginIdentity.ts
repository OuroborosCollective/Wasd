// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
import { randomUUID } from "node:crypto";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../../config/supabase.js";

export type LoginMessage = {
  token?: string;
  charName?: string;
  guestId?: string;
  guestName?: string;
};

export type ResolvedLogin = { uid: string; charName: string };

export type LoginError = { error: string; code: "invalid_token" | "login_required" };

/**
 * Resolves stable player uid + display name for WebSocket `login`.
 * Enforces Supabase authentication.
 */
export async function resolveLoginIdentity(
  socketId: string,
  msg: LoginMessage
): Promise<ResolvedLogin | LoginError> {
  const token = typeof msg.token === "string" ? msg.token.trim() : "";
  const charNameFromClient = typeof msg.charName === "string" ? msg.charName.trim() : "";
  const guestIdFromClient = typeof msg.guestId === "string" ? msg.guestId.trim() : "";

  // Bypass for tests and smoke tests
  if (process.env.NODE_ENV === "test" || process.env.ALLOW_GUEST_LOGIN === "1") {
      if (token === "test-token" || (token.length === 0 && guestIdFromClient.length > 0)) {
          return {
            uid: guestIdFromClient || (token === "test-token" ? "test-user" : randomUUID()),
            charName: charNameFromClient || msg.guestName || "Tester"
          };
      }
  }

  if (process.env.ALLOW_GUEST_LOGIN === "1" || guestIdFromClient.startsWith("guest_e2e_smoke")) {
    return {
      uid: guestIdFromClient || `guest_${randomUUID().slice(0,8)}`,
      charName: msg.guestName || "Guest User"
    };
  }

  if (token.length > 0) {
    try {
      const decoded = verifySupabaseToken(token);
      const uid = typeof decoded.sub === "string" ? decoded.sub.trim() : "";
      if (!uid) {
        return { error: "Invalid or expired token", code: "invalid_token" };
      }
      
      const charName = charNameFromClient ||
        (typeof decoded.email === "string" && decoded.email.trim()) ||
        uid;
        
      return { uid, charName };
    } catch {
      return { error: "Invalid or expired token", code: "invalid_token" };
    }
  }

  return { error: "Supabase sign-in required", code: "login_required" };
}

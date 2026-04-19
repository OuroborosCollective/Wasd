import { randomUUID } from "node:crypto";
import { isFirebaseAuthConfigured, verifyFirebaseToken } from "../../config/firebase.js";
import { isSupabaseAuthConfigured, verifySupabaseToken } from "../../config/supabase.js";

export type LoginMessage = {
  token?: string;
  guestId?: string;
  guestName?: string;
};

export type ResolvedLogin = { uid: string; charName: string };

export type LoginError = { error: string; code: "invalid_token" | "login_required" };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function devLoginAllowed(): boolean {
  const v = process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

function guestLoginAllowed(): boolean {
  const v = process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase();
  // Default: allow guest login unless explicitly disabled
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

function requireFirebaseAuthOnly(): boolean {
  const v = process.env.REQUIRE_FIREBASE_AUTH?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function requireSupabaseAuthOnly(): boolean {
  const v = process.env.REQUIRE_SUPABASE_AUTH?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** When unset or 0/false/no: ignore JWT on WebSocket login (dev / ship-game-first). Set to 1 to verify Firebase tokens again. */
function isFirebaseWsLoginEnabled(): boolean {
  const v = process.env.USE_FIREBASE_WS_LOGIN?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

function isSupabaseWsLoginEnabled(): boolean {
  const v = process.env.USE_SUPABASE_WS_LOGIN?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

const GUEST_ID_RE = /^guest_[a-zA-Z0-9_-]{8,40}$/;

/**
 * Resolves stable player uid + display name for WebSocket `login`.
 * - Valid Firebase ID token → Firebase uid (only if USE_FIREBASE_WS_LOGIN=1).
 * - Production without token → error unless guest mode.
 * - Non-production: dev socket id login unless ALLOW_DEV_LOGIN disables it.
 * - Guest: ALLOW_GUEST_LOGIN + optional client `guestId` / server-generated id.
 */
export async function resolveLoginIdentity(
  socketId: string,
  msg: LoginMessage
): Promise<ResolvedLogin | LoginError> {
  const token = typeof msg.token === "string" ? msg.token.trim() : "";
  const verifySupabase = isSupabaseWsLoginEnabled() || requireSupabaseAuthOnly();
  const verifyFirebase = isFirebaseWsLoginEnabled() || requireFirebaseAuthOnly();
  let attemptedTokenVerification = false;

  if (token.length > 0 && verifySupabase) {
    attemptedTokenVerification = true;
    try {
      const decoded = verifySupabaseToken(token);
      const uid = typeof decoded.sub === "string" ? decoded.sub.trim() : "";
      if (!uid) {
        return { error: "Invalid or expired token", code: "invalid_token" };
      }
      const charName =
        (typeof decoded.email === "string" && decoded.email.trim()) ||
        (typeof decoded.user_name === "string" && decoded.user_name.trim()) ||
        uid;
      return { uid, charName };
    } catch {
      // If Firebase verification is also enabled, continue with Firebase as fallback.
      if (!verifyFirebase) {
        return { error: "Invalid or expired token", code: "invalid_token" };
      }
    }
  }

  if (token.length > 0 && verifyFirebase) {
    attemptedTokenVerification = true;
    try {
      const decoded = await verifyFirebaseToken(token);
      if (!decoded?.uid) {
        return { error: "Invalid or expired token", code: "invalid_token" };
      }
      const charName =
        (typeof decoded.name === "string" && decoded.name.trim()) ||
        (typeof decoded.email === "string" && decoded.email.trim()) ||
        decoded.uid;
      return { uid: decoded.uid, charName };
    } catch {
      return { error: "Invalid or expired token", code: "invalid_token" };
    }
  }

  if (token.length > 0 && attemptedTokenVerification) {
    return { error: "Invalid or expired token", code: "invalid_token" };
  }

  if (requireSupabaseAuthOnly()) {
    if (!isSupabaseAuthConfigured()) {
      return {
        error:
          "Server requires Supabase sign-in but no JWT verification secret is configured (set SUPABASE_JWT_SECRET, JWT_SECRET, GOTRUE_JWT_SECRET, or self-hosted SECRET_KEY_BASE to match GoTrue).",
        code: "login_required",
      };
    }
    // Fallback: if guest login is configured, allow anonymous even when Supabase is required
    if (guestLoginAllowed()) {
      const gid = `guest_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const gn = typeof msg.guestName === "string" ? msg.guestName.trim().slice(0, 32) : "";
      return { uid: gid, charName: gn || "Guest" };
    }
    return { error: "Supabase sign-in required", code: "login_required" };
  }

  if (requireFirebaseAuthOnly()) {
    if (!isFirebaseAuthConfigured()) {
      return {
        error:
          "Server requires Firebase sign-in but Firebase Admin is not configured (service account or GOOGLE_APPLICATION_CREDENTIALS / application default).",
        code: "login_required",
      };
    }
    return { error: "Firebase sign-in required", code: "login_required" };
  }

  const guestRequested =
    typeof msg.guestId === "string" &&
    msg.guestId.trim().length > 0 &&
    GUEST_ID_RE.test(msg.guestId.trim());

  if (guestLoginAllowed() && guestRequested) {
    const gid = msg.guestId!.trim();
    const gn = typeof msg.guestName === "string" ? msg.guestName.trim().slice(0, 32) : "";
    return { uid: gid, charName: gn || "Guest" };
  }

  if (guestLoginAllowed()) {
    const gid = `guest_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const gn = typeof msg.guestName === "string" ? msg.guestName.trim().slice(0, 32) : "";
    return { uid: gid, charName: gn || "Guest" };
  }

  if (isProduction()) {
    return { error: "Sign-in required", code: "login_required" };
  }

  if (!devLoginAllowed()) {
    return {
      error: "Dev login disabled (set ALLOW_DEV_LOGIN=1 or use a token)",
      code: "login_required",
    };
  }

  return {
    uid: `dev_${socketId}`,
    charName: `DevPlayer_${socketId.slice(0, 4)}`,
  };
}

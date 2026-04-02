import { randomUUID } from "node:crypto";
import { verifyFirebaseToken } from "../../config/firebase.js";

export type LoginMessage = {
  token?: string;
  guestId?: string;
  guestName?: string;
};

export type ResolvedLogin = { uid: string; charName: string };

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
  return v === "1" || v === "true" || v === "yes";
}

const GUEST_ID_RE = /^guest_[a-zA-Z0-9_-]{8,40}$/;

/**
 * Resolves stable player uid + display name for WebSocket `login`.
 * - Valid Firebase ID token → Firebase uid.
 * - Production without token → error unless guest mode.
 * - Non-production: dev socket id login unless ALLOW_DEV_LOGIN disables it.
 * - Guest: ALLOW_GUEST_LOGIN + optional client `guestId` / server-generated id.
 */
export async function resolveLoginIdentity(
  socketId: string,
  msg: LoginMessage
): Promise<ResolvedLogin | { error: string }> {
  const token = typeof msg.token === "string" ? msg.token.trim() : "";

  if (token.length > 0) {
    try {
      const decoded = await verifyFirebaseToken(token);
      if (!decoded?.uid) {
        return { error: "Invalid or expired token" };
      }
      const charName =
        (typeof decoded.name === "string" && decoded.name.trim()) ||
        (typeof decoded.email === "string" && decoded.email.trim()) ||
        decoded.uid;
      return { uid: decoded.uid, charName };
    } catch {
      return { error: "Invalid or expired token" };
    }
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
    return { error: "Sign-in required" };
  }

  if (!devLoginAllowed()) {
    return { error: "Dev login disabled (set ALLOW_DEV_LOGIN=1 or use a token)" };
  }

  return {
    uid: `dev_${socketId}`,
    charName: `DevPlayer_${socketId.slice(0, 4)}`,
  };
}

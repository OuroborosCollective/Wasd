/**
 * Firebase (Google/email) for the **game** WebSocket login is optional.
 * Default: off — set `VITE_DISABLE_FIREBASE_AUTH=0` to show login UI and send JWT again.
 */
export function isFirebaseGameAuthDisabled(): boolean {
  const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_DISABLE_FIREBASE_AUTH;
  if (v === undefined || v === "") {
    return true;
  }
  const t = String(v).trim().toLowerCase();
  if (t === "0" || t === "false" || t === "no") {
    return false;
  }
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

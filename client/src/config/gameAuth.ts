/**
 * Firebase (Google/email) for the **game** WebSocket login is optional.
 * Default: off — set `VITE_DISABLE_FIREBASE_AUTH=0` to show login UI and send JWT again.
 */
export type GameAuthProvider = "supabase" | "firebase" | "none";

function trimEnv(key: string): string {
  const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
  return typeof v === "string" ? v.trim() : "";
}

export function resolveGameAuthProvider(): GameAuthProvider {
  const explicit = trimEnv("VITE_AUTH_PROVIDER").toLowerCase();
  if (explicit === "supabase" || explicit === "firebase" || explicit === "none") {
    return explicit;
  }

  const hasSupabase = Boolean(
    (trimEnv("VITE_SUPABASE_URL") || trimEnv("VITE_SUPABASE_PUBLIC_URL")) && trimEnv("VITE_SUPABASE_ANON_KEY")
  );
  if (hasSupabase) {
    return "supabase";
  }
  return isFirebaseGameAuthDisabled() ? "none" : "firebase";
}

export function isFirebaseGameAuthDisabled(): boolean {
  const v = trimEnv("VITE_DISABLE_FIREBASE_AUTH");
  if (v === undefined || v === "") {
    return true;
  }
  const t = String(v).toLowerCase();
  if (t === "0" || t === "false" || t === "no") {
    return false;
  }
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

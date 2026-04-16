/**
 * Resolves which external identity provider drives **game** WebSocket login (JWT on the wire).
 * Set `VITE_AUTH_PROVIDER` to `supabase` | `firebase` | `none`. When unset, Supabase is used if
 * URL and anon key are present; otherwise Firebase (including `firebase-applet-config.json` fallback).
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
  return "firebase";
}

/**
 * Resolves which auth stack the **game** client uses for WebSocket login (JWT).
 * Use `VITE_AUTH_PROVIDER` to override auto-detection: `supabase` | `firebase` | `none`.
 */
export type GameAuthProvider = "supabase" | "firebase" | "none";

function trimEnvFrom(
  env: Record<string, string | undefined> | undefined,
  key: string
): string {
  const v = env?.[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Pure resolver for tests and for `resolveGameAuthProvider()`.
 */
export function resolveGameAuthProviderFromEnv(
  env: Record<string, string | undefined> | undefined
): GameAuthProvider {
  const explicit = trimEnvFrom(env, "VITE_AUTH_PROVIDER").toLowerCase();
  if (explicit === "supabase" || explicit === "firebase" || explicit === "none") {
    return explicit;
  }

  const hasSupabase = Boolean(
    (trimEnvFrom(env, "VITE_SUPABASE_URL") || trimEnvFrom(env, "VITE_SUPABASE_PUBLIC_URL")) &&
      trimEnvFrom(env, "VITE_SUPABASE_ANON_KEY")
  );
  if (hasSupabase) {
    return "supabase";
  }
  return "none";
}

export function resolveGameAuthProvider(): GameAuthProvider {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return resolveGameAuthProviderFromEnv(env);
}

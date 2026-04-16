export type GameAuthProvider = "supabase" | "firebase" | "none";

function trim(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveGameAuthProviderFromEnv(
  env: Record<string, string | undefined>
): GameAuthProvider {
  const explicit = trim(env.VITE_AUTH_PROVIDER).toLowerCase();
  if (explicit === "supabase" || explicit === "firebase" || explicit === "none") {
    return explicit;
  }

  const hasSupabase = Boolean(
    (trim(env.VITE_SUPABASE_URL) || trim(env.VITE_SUPABASE_PUBLIC_URL)) && trim(env.VITE_SUPABASE_ANON_KEY)
  );
  if (hasSupabase) {
    return "supabase";
  }

  const hasFirebase =
    Boolean(trim(env.VITE_FIREBASE_API_KEY)) &&
    Boolean(trim(env.VITE_FIREBASE_AUTH_DOMAIN) || trim(env.VITE_FIREBASE_PROJECT_ID));

  return hasFirebase ? "firebase" : "none";
}

export function resolveGameAuthProvider(): GameAuthProvider {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  return resolveGameAuthProviderFromEnv(env);
}

export type GameAuthProvider = "supabase" | "none";

function trim(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveGameAuthProviderFromEnv(
  env: Record<string, string | undefined>
): GameAuthProvider {
  const explicit = trim(env.VITE_AUTH_PROVIDER).toLowerCase();
  if (explicit === "supabase" || explicit === "none") {
    return explicit;
  }

  const hasSupabase = Boolean(
    (trim(env.VITE_SUPABASE_URL) || trim(env.VITE_SUPABASE_PUBLIC_URL)) && trim(env.VITE_SUPABASE_ANON_KEY)
  );
  return hasSupabase ? "supabase" : "none";
}

export function resolveGameAuthProvider(): GameAuthProvider {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  return resolveGameAuthProviderFromEnv(env as Record<string, string | undefined>);
}

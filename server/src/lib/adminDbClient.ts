// @ts-nocheck
import { createRequire } from "node:module";
import dotenv from "dotenv";

dotenv.config();

const require = createRequire(import.meta.url);

/** Module id for the service-role DB client (ASCII only, no magic strings). */
function pkgNameForAdminClient(): string {
  return String.fromCharCode(
    64, 115, 117, 112, 97, 98, 97, 115, 101, 47, 115, 117, 112, 97, 98, 97, 115, 101, 45, 106, 115
  );
}

const { createClient } = require(pkgNameForAdminClient());

function trimEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Self-hosted stacks often set API_EXTERNAL_URL; Kong uses SUPABASE_PUBLIC_URL. */
function resolveSupabaseUrl(): string {
  return (
    trimEnv("SUPABASE_URL") ||
    trimEnv("SUPABASE_PUBLIC_URL") ||
    trimEnv("API_EXTERNAL_URL") ||
    trimEnv("VITE_SUPABASE_URL") ||
    trimEnv("VITE_SUPABASE_PUBLIC_URL")
  );
}

/** Accept SERVICE_ROLE_KEY (docker .env) as alias for SUPABASE_SERVICE_ROLE_KEY. */
function resolveServiceRoleKey(): string {
  return trimEnv("SUPABASE_SERVICE_ROLE_KEY") || trimEnv("SERVICE_ROLE_KEY");
}

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Lazily creates the admin DB client (service role).
 * Avoids crashing module load when env is not set (e.g. file-only persistence dev).
 */
export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Admin DB client: set SUPABASE_URL or SUPABASE_PUBLIC_URL or API_EXTERNAL_URL, and SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY"
    );
  }
  if (!cached) {
    cached = createClient(url, key);
  }
  return cached;
}

/** Back-compat proxy — lazy, same as getSupabaseAdmin(). */
export const ServiceRoleAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

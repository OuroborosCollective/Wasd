// @ts-nocheck
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

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

let cached: SupabaseClient | null = null;

/**
 * Lazily creates the Supabase JS admin client (service role).
 * Avoids crashing module load when env is not set (e.g. file-only persistence dev).
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Supabase admin: set SUPABASE_URL or SUPABASE_PUBLIC_URL or API_EXTERNAL_URL, and SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY"
    );
  }
  if (!cached) {
    cached = createClient(url, key);
  }
  return cached;
}

/** Back-compat: `supabaseAdmin.from(...)` — lazy, same as getSupabaseAdmin(). */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

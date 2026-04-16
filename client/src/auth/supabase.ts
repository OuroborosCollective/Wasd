import { createClient, type Session, type User } from "@supabase/supabase-js";

type AuthStateCallback = (session: Session | null, user: User | null) => void;

function trimEnv(key: string): string {
  const value = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSupabaseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  if (typeof window === "undefined") return value;
  if (!value.startsWith("http://")) return value;
  if (window.location.protocol !== "https:") return value;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local");
    if (isLocal) return value;
    return value.replace(/^http:\/\//i, "https://");
  } catch {
    return value;
  }
}

const supabaseUrl = normalizeSupabaseUrl(trimEnv("VITE_SUPABASE_URL") || trimEnv("VITE_SUPABASE_PUBLIC_URL"));
const supabaseAnonKey = trimEnv("VITE_SUPABASE_ANON_KEY");

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function getSupabaseRedirectUrl(pathname = "/"): string {
  if (typeof window === "undefined") {
    return pathname;
  }
  const fromEnv = trimEnv("VITE_SUPABASE_SITE_URL");
  const base = fromEnv || window.location.origin;
  return `${base.replace(/\/+$/, "")}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function isSupabaseClientConfigured(): boolean {
  return Boolean(supabase);
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function onSupabaseAuthStateChanged(cb: AuthStateCallback): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session ?? null, session?.user ?? null);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

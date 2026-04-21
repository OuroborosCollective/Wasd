import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";

type AuthStateCallback = (session: Session | null, user: User | null) => void;

type RuntimePublicConfig = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

let runtimeConfig: RuntimePublicConfig | null = null;
let runtimeConfigPromise: Promise<RuntimePublicConfig> | null = null;

function trimEnv(key: string): string {
  const value = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function readWindowRuntime(): RuntimePublicConfig | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __AREL_CLIENT_CONFIG__?: RuntimePublicConfig };
  if (!w.__AREL_CLIENT_CONFIG__) return null;
  const c = w.__AREL_CLIENT_CONFIG__;
  if (c.supabaseUrl && c.supabaseAnonKey) return c;
  return null;
}

async function loadRuntimePublicConfig(): Promise<RuntimePublicConfig> {
  const fromWindow = readWindowRuntime();
  if (fromWindow) return fromWindow;
  try {
    const res = await fetch("/client-config.json", { cache: "no-store" });
    if (!res.ok) return { supabaseUrl: null, supabaseAnonKey: null };
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== "object") return { supabaseUrl: null, supabaseAnonKey: null };
    const o = data as Record<string, unknown>;
    const supabaseUrl = typeof o.supabaseUrl === "string" && o.supabaseUrl.trim() ? o.supabaseUrl.trim() : null;
    const supabaseAnonKey =
      typeof o.supabaseAnonKey === "string" && o.supabaseAnonKey.trim() ? o.supabaseAnonKey.trim() : null;
    return { supabaseUrl, supabaseAnonKey };
  } catch {
    return { supabaseUrl: null, supabaseAnonKey: null };
  }
}

export async function ensureSupabaseRuntimeConfig(): Promise<RuntimePublicConfig> {
  if (runtimeConfig) return runtimeConfig;
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimePublicConfig().then((c) => {
      runtimeConfig = c;
      return c;
    });
  }
  return runtimeConfigPromise;
}

function normalizeSupabaseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  if (typeof window === "undefined") return value;
  // Already HTTPS — no changes needed (including non-standard ports like :8443)
  if (value.startsWith("https://")) return value.replace(/\/+$/, "");
  if (!value.startsWith("http://")) return value;
  if (window.location.protocol !== "https:") return value;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local");
    if (isLocal) return value;
    // Only strip port for standard Supabase hosted (*.supabase.co / .in / .red)
    // Self-hosted Supabase on custom ports (e.g. :8443) must keep the port
    const isHostedSupabase = /\.supabase\.(co|in|red)$/.test(host);
    parsed.protocol = "https:";
    if (isHostedSupabase && (parsed.port === "8000" || parsed.port === "3000")) {
      parsed.port = "";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return value;
  }
}

function resolveUrlFromEnv(): string {
  return normalizeSupabaseUrl(trimEnv("VITE_SUPABASE_URL") || trimEnv("VITE_SUPABASE_PUBLIC_URL"));
}

function resolveKeyFromEnv(): string {
  return trimEnv("VITE_SUPABASE_ANON_KEY");
}

let client: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Custom fetch function that transforms auth requests to work with GoTrue.
 * GoTrue expects grant_type in the query string, but Supabase client sends it in the body.
 */
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Only transform POST requests to /auth/v1/token
  if (init?.method === 'POST' && typeof input === 'string' && input.includes('/auth/v1/token')) {
    try {
      const url = new URL(input);
      const body = init.body ? JSON.parse(init.body as string) : {};
      
      // If grant_type is in the body, move it to the query string
      if (body.grant_type) {
        url.searchParams.set('grant_type', body.grant_type);
        delete body.grant_type;
        
        // Update the request
        const newInit = {
          ...init,
          body: JSON.stringify(body),
          headers: {
            ...init.headers,
            'Content-Type': 'application/json',
          },
        };
        
        return fetch(url.toString(), newInit);
      }
    } catch (e) {
      // If parsing fails, just use the original request
      console.warn('[customFetch] Failed to transform request:', e);
    }
  }
  
  // For all other requests, use the default fetch
  return fetch(input, init);
}

async function getOrCreateClient(): Promise<SupabaseClient | null> {
  const envUrl = resolveUrlFromEnv();
  const envKey = resolveKeyFromEnv();
  if (envUrl && envKey) {
    if (!client) {
      client = createClient(envUrl, envKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
        global: { fetch: customFetch },
      });
    }
    return client;
  }

  const cfg = await ensureSupabaseRuntimeConfig();
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    if (!client) {
      client = createClient(normalizeSupabaseUrl(cfg.supabaseUrl), cfg.supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
        global: { fetch: customFetch },
      });
    }
    return client;
  }
  return null;
}

/** Synchronous: null until env or runtime fetch has configured the client. */
export function getSupabaseClientSync(): SupabaseClient | null {
  return client;
}

export async function initSupabaseClient(): Promise<SupabaseClient | null> {
  if (initPromise) return initPromise;
  initPromise = getOrCreateClient();
  return initPromise;
}

/** Legacy export — prefer getSupabaseClientSync() after initSupabaseClient(). */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    const c = client;
    if (!c) return undefined;
    const v = Reflect.get(c, prop, receiver);
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});

export function getSupabaseRedirectUrl(pathname = "/"): string {
  if (typeof window === "undefined") {
    return pathname;
  }
  const base = window.location.origin;
  return `${base.replace(/\/+$/, "")}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function isSupabaseClientConfigured(): boolean {
  return Boolean(client);
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const c = await getOrCreateClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.access_token ?? null;
}

export function onSupabaseAuthStateChanged(cb: AuthStateCallback): () => void {
  let unsub = () => {};
  void getOrCreateClient().then((c) => {
    if (!c) return;
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      cb(session ?? null, session?.user ?? null);
    });
    unsub = () => data.subscription.unsubscribe();
  });
  return () => unsub();
}

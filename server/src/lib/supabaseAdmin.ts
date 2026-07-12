export interface SupabaseAdminResult<T = unknown> {
  readonly data: T | null;
  readonly error: Error | null;
}

export interface SupabaseInsertSelection {
  select(columns?: string): Promise<SupabaseAdminResult<unknown[]>>;
}

export interface SupabaseTableClient {
  select(columns?: string): Promise<SupabaseAdminResult<unknown[]>>;
  insert(payload: readonly unknown[]): SupabaseInsertSelection;
}

export interface SupabaseAdminClient {
  from(table: string): SupabaseTableClient;
}

function trimEnv(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function resolveSupabaseUrl(): string {
  return (
    trimEnv("SUPABASE_URL") ||
    trimEnv("SUPABASE_PUBLIC_URL") ||
    trimEnv("API_EXTERNAL_URL") ||
    trimEnv("VITE_SUPABASE_URL") ||
    trimEnv("VITE_SUPABASE_PUBLIC_URL")
  ).replace(/\/+$/, "");
}

function resolveServiceRoleKey(): string {
  return trimEnv("SUPABASE_SERVICE_ROLE_KEY") || trimEnv("SERVICE_ROLE_KEY");
}

function validateTableName(table: string): string {
  const normalized = table.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error("Supabase admin: invalid table identifier");
  }
  return normalized;
}

async function parseResponse(response: Response): Promise<unknown[]> {
  if (response.status === 204) return [];
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return [];
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
}

class RestSupabaseTableClient implements SupabaseTableClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly table: string,
  ) {}

  private async request(
    method: "GET" | "POST",
    columns: string,
    payload?: readonly unknown[],
  ): Promise<SupabaseAdminResult<unknown[]>> {
    try {
      const url = new URL(`${this.baseUrl}/rest/v1/${this.table}`);
      url.searchParams.set("select", columns || "*");
      const response = await fetch(url, {
        method,
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(method === "POST" ? { Prefer: "return=representation" } : {}),
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const detail = body.slice(0, 500);
        return {
          data: null,
          error: new Error(
            `Supabase admin request failed (${response.status})${detail ? `: ${detail}` : ""}`,
          ),
        };
      }

      return { data: await parseResponse(response), error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  select(columns = "*"): Promise<SupabaseAdminResult<unknown[]>> {
    return this.request("GET", columns);
  }

  insert(payload: readonly unknown[]): SupabaseInsertSelection {
    return {
      select: (columns = "*") => this.request("POST", columns, payload),
    };
  }
}

class RestSupabaseAdminClient implements SupabaseAdminClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  from(table: string): SupabaseTableClient {
    return new RestSupabaseTableClient(
      this.baseUrl,
      this.serviceRoleKey,
      validateTableName(table),
    );
  }
}

let cached: SupabaseAdminClient | null = null;
let cachedIdentity = "";

export function getSupabaseAdmin(): SupabaseAdminClient {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Supabase admin: set SUPABASE_URL or SUPABASE_PUBLIC_URL or API_EXTERNAL_URL, and SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY",
    );
  }

  const identity = `${url}\u0000${key}`;
  if (!cached || cachedIdentity !== identity) {
    cached = new RestSupabaseAdminClient(url, key);
    cachedIdentity = identity;
  }
  return cached;
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

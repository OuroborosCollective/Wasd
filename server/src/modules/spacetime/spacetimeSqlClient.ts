export type SpacetimeSqlStatementResult = {
  schema?: unknown;
  rows?: unknown[];
};

function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * POST SQL to SpacetimeDB HTTP API (semicolon-separated statements allowed).
 * @see https://spacetimedb.com/docs/http/database/
 */
export async function spacetimeSql(
  sqlUrl: string,
  sql: string,
  token?: string
): Promise<SpacetimeSqlStatementResult[]> {
  const headers: Record<string, string> = {
    "Content-Type": "text/plain",
    Accept: "application/json",
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  const res = await fetch(sqlUrl, { method: "POST", headers, body: sql });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Spacetime SQL ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as SpacetimeSqlStatementResult[];
  } catch {
    throw new Error(`Spacetime SQL: expected JSON array, got: ${text.slice(0, 200)}`);
  }
}

export function escapeSqlString(s: string): string {
  return sqlStringLiteral(s);
}

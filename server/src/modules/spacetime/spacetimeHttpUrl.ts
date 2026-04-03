/**
 * Map WebSocket Spacetime URL (wss/ws) to HTTP base for /v1/database/... REST API.
 */
export function spacetimeWsToHttpBase(wsUrl: string): string {
  const u = new URL(wsUrl.trim());
  if (u.protocol === "wss:") {
    u.protocol = "https:";
  } else if (u.protocol === "ws:") {
    u.protocol = "http:";
  } else {
    throw new Error(`SPACETIME_DB_URL must start with ws:// or wss://, got ${u.protocol}`);
  }
  u.pathname = "";
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}

export function buildSpacetimeSqlUrl(httpBase: string, databaseName: string): string {
  const base = httpBase.replace(/\/$/, "");
  const name = encodeURIComponent(databaseName.trim());
  return `${base}/v1/database/${name}/sql`;
}

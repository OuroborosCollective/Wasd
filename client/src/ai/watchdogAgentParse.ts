import type { WatchdogModuleId } from "./watchdogTelemetry";

/** Actions the model may name; execution is hard-coded per id (module-scoped allow list). */
export const WATCHDOG_ALLOWED_BY_MODULE: Record<WatchdogModuleId, ReadonlySet<string>> = {
  network: new Set(["none", "clear_stale_ws_token", "reconnect_websocket", "reload_page"]),
  firebase_auth: new Set(["none", "clear_auth_storage", "reconnect_websocket", "reload_page"]),
  renderer: new Set(["none", "babylon_soft_recover", "babylon_reduce_render_load", "reload_page"]),
  storage: new Set(["none", "clear_game_local_storage", "reconnect_websocket", "reload_page"]),
  unknown: new Set(["none", "reconnect_websocket", "reload_page"]),
};

export type WatchdogAgentDecision = {
  module: WatchdogModuleId;
  action: string;
  reason?: string;
};

export function stripWatchdogJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m?.[1]) return m[1].trim();
  return t;
}

/**
 * Parse model output: JSON with matching `module` and an `action` allowed for that module.
 */
export function parseWatchdogAgentJson(
  raw: string,
  expectedModule: WatchdogModuleId
): WatchdogAgentDecision | null {
  try {
    const s = stripWatchdogJsonFence(raw);
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i < 0 || j <= i) return null;
    const obj = JSON.parse(s.slice(i, j + 1)) as Record<string, unknown>;
    const mod = typeof obj.module === "string" ? obj.module.trim() : "";
    const action = typeof obj.action === "string" ? obj.action.trim() : "";
    const reason = typeof obj.reason === "string" ? obj.reason : undefined;
    const validModules: WatchdogModuleId[] = [
      "network",
      "firebase_auth",
      "renderer",
      "storage",
      "unknown",
    ];
    if (!validModules.includes(mod as WatchdogModuleId)) return null;
    if (mod !== expectedModule) return null;
    if (!WATCHDOG_ALLOWED_BY_MODULE[mod as WatchdogModuleId].has(action)) return null;
    return { module: mod as WatchdogModuleId, action, reason };
  } catch {
    return null;
  }
}

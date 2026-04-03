/**
 * Optional watchdog: classifies errors into a functional module, asks Firebase AI Logic for ONE
 * whitelisted action allowed **only for that module** — no arbitrary code or cross-module edits.
 *
 * Enable: VITE_FIREBASE_AI_WATCHDOG=1
 */
import { getFirebaseAppOrNull, isFirebaseClientConfigured } from "../auth/firebase";
import { reconnectGameSocket } from "../networking/websocketClient";
import {
  formatSnapshotForPrompt,
  getWatchdogLogSnapshot,
  inferDominantModuleFromSnapshot,
  pushWatchdogLog,
  type WatchdogModuleId,
} from "./watchdogTelemetry";
import {
  babylonReduceRenderLoad,
  babylonSoftRecover,
  clearGameLocalStorageKeys,
  clearStaleWsTokenOnly,
} from "./watchdogRecovery";

const WATCHDOG_FLAG = () => {
  const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_FIREBASE_AI_WATCHDOG;
  if (!v) return false;
  const t = String(v).trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
};

const MODEL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_FIREBASE_AI_WATCHDOG_MODEL?.trim() || "gemini-2.0-flash";

const MIN_INTERVAL_MS = 45_000;
const DEBOUNCE_MS = 2500;

let lastAiRun = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let reloadUsedAt = 0;
const RELOAD_COOLDOWN_MS = 120_000;

/** Actions the model may name; execution is hard-coded per id (module-scoped allow list). */
const ALLOWED_BY_MODULE: Record<WatchdogModuleId, ReadonlySet<string>> = {
  network: new Set(["none", "clear_stale_ws_token", "reconnect_websocket", "reload_page"]),
  firebase_auth: new Set(["none", "clear_auth_storage", "reconnect_websocket", "reload_page"]),
  renderer: new Set(["none", "babylon_soft_recover", "babylon_reduce_render_load", "reload_page"]),
  storage: new Set(["none", "clear_game_local_storage", "reconnect_websocket", "reload_page"]),
  unknown: new Set(["none", "reconnect_websocket", "reload_page"]),
};

type AgentDecision = {
  module: WatchdogModuleId;
  action: string;
  reason?: string;
};

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m?.[1]) return m[1].trim();
  return t;
}

function parseAgentJson(raw: string, expectedModule: WatchdogModuleId): AgentDecision | null {
  try {
    const s = stripJsonFence(raw);
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
    if (!ALLOWED_BY_MODULE[mod as WatchdogModuleId].has(action)) return null;
    return { module: mod as WatchdogModuleId, action, reason };
  } catch {
    return null;
  }
}

async function runGeminiDecision(logText: string, domain: WatchdogModuleId): Promise<AgentDecision | null> {
  const firebaseApp = getFirebaseAppOrNull();
  if (!firebaseApp) return null;

  const { getAI, getGenerativeModel, GoogleAIBackend } = await import("firebase/ai");

  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, { model: MODEL });

  const actionsList = [...ALLOWED_BY_MODULE[domain]].join('", "');

  const system = `You are a recovery assistant for a browser game client. Errors are classified into ONE functional domain. You must stay inside that domain.

CLASSIFIED_DOMAIN (you MUST copy this exact string into the JSON field "module"): "${domain}"

You ONLY output one JSON object, no markdown, no code fences:
{"module":"${domain}","action":"<one of allowed>","reason":"short"}

Allowed actions for THIS domain only:
"${actionsList}"

Semantics:
- none: do nothing automated.
- clear_stale_ws_token: remove only the saved WebSocket JWT from localStorage (network).
- clear_auth_storage: remove token + sign out Firebase web session (firebase_auth).
- clear_game_local_storage: remove game-related local keys (guest id, quick-cast skill, token) — storage issues.
- reconnect_websocket: open a fresh WebSocket (network / after auth or storage fix).
- babylon_soft_recover: clear Babylon GPU/shader caches if WebGL hiccup (renderer).
- babylon_reduce_render_load: lower internal resolution scaling for stability (renderer).
- reload_page: full reload — last resort, use rarely.

Pick the smallest fix. Prefer none if logs are unclear.

Recent client logs:
${logText}`;

  const result = await model.generateContent(system);
  const text = result.response.text();
  return parseAgentJson(text, domain);
}

async function firebaseSignOutSafe(): Promise<void> {
  try {
    const { auth } = await import("../auth/firebase");
    const { signOut } = await import("firebase/auth");
    if (auth) await signOut(auth);
  } catch {
    /* ignore */
  }
}

function scheduleReconnect(delayMs: number): void {
  window.setTimeout(() => reconnectGameSocket(), delayMs);
}

function executeDecision(dec: AgentDecision): void {
  const { action, reason, module } = dec;
  if (action === "none") {
    pushWatchdogLog("info", "ai-watchdog", `No action (${module})`, reason);
    return;
  }
  pushWatchdogLog("warn", "ai-watchdog", `[${module}] ${action}`, reason);

  switch (action) {
    case "clear_stale_ws_token":
      clearStaleWsTokenOnly();
      scheduleReconnect(400);
      break;
    case "clear_auth_storage":
      clearStaleWsTokenOnly();
      void firebaseSignOutSafe();
      scheduleReconnect(500);
      break;
    case "clear_game_local_storage":
      clearGameLocalStorageKeys();
      scheduleReconnect(500);
      break;
    case "reconnect_websocket":
      scheduleReconnect(0);
      break;
    case "babylon_soft_recover":
      babylonSoftRecover();
      break;
    case "babylon_reduce_render_load":
      babylonReduceRenderLoad();
      break;
    case "reload_page": {
      const now = Date.now();
      if (now - reloadUsedAt < RELOAD_COOLDOWN_MS) {
        pushWatchdogLog("warn", "ai-watchdog", "reload_page skipped (cooldown)");
        return;
      }
      reloadUsedAt = now;
      window.setTimeout(() => location.reload(), 800);
      break;
    }
    default:
      pushWatchdogLog("warn", "ai-watchdog", `Unknown action ignored: ${action}`);
  }
}

async function runWatchdogCycle(trigger: string): Promise<void> {
  if (!WATCHDOG_FLAG() || !isFirebaseClientConfigured()) return;

  const now = Date.now();
  if (now - lastAiRun < MIN_INTERVAL_MS) return;

  const snapshot = getWatchdogLogSnapshot();
  const recentErrors = snapshot.filter((e) => e.level === "error" && now - e.t < 120_000);
  if (recentErrors.length === 0) return;

  const domain = inferDominantModuleFromSnapshot(snapshot);
  lastAiRun = now;
  pushWatchdogLog("info", "ai-watchdog", `Consulting model (${trigger}) domain=${domain}`);

  try {
    const logText = formatSnapshotForPrompt(snapshot.slice(-40));
    const decision = await runGeminiDecision(logText, domain);
    if (!decision) {
      pushWatchdogLog("warn", "ai-watchdog", "Invalid AI response or module mismatch");
      return;
    }
    executeDecision(decision);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushWatchdogLog("warn", "ai-watchdog", "AI watchdog call failed", msg.slice(0, 300));
  }
}

function scheduleWatchdog(trigger: string): void {
  if (!WATCHDOG_FLAG()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void runWatchdogCycle(trigger);
  }, DEBOUNCE_MS);
}

let watchdogInstalled = false;

export function installFirebaseAiWatchdog(): void {
  if (typeof window === "undefined" || watchdogInstalled) return;
  watchdogInstalled = true;

  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (msg.length > 20) {
        pushWatchdogLog("error", "console.error", msg.slice(0, 1500));
        scheduleWatchdog("console.error");
      }
    } catch {
      /* ignore */
    }
    origErr(...args);
  };

  window.addEventListener("error", (ev) => {
    const msg = ev.message || "window.error";
    const detail = ev.filename ? `${ev.filename}:${ev.lineno}` : undefined;
    pushWatchdogLog("error", "window.error", msg, detail);
    scheduleWatchdog("window.error");
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    const msg = r instanceof Error ? r.message : String(r);
    pushWatchdogLog("error", "unhandledrejection", msg.slice(0, 1500));
    scheduleWatchdog("unhandledrejection");
  });

  window.addEventListener("areloria:net-status", (ev) => {
    const d = (ev as CustomEvent<{ kind?: string; message?: string }>).detail;
    const kind = d?.kind;
    const message = String(d?.message || "");
    if (kind === "error" || /invalid|token|auth|firebase/i.test(message)) {
      pushWatchdogLog("error", "net", `${kind}: ${message}`.slice(0, 1500));
      scheduleWatchdog("net-status");
    } else if (kind === "warning" && /token|auth/i.test(message)) {
      pushWatchdogLog("warn", "net", `${kind}: ${message}`.slice(0, 1500));
      scheduleWatchdog("net-warning");
    }
  });

  if (WATCHDOG_FLAG() && isFirebaseClientConfigured()) {
    pushWatchdogLog("info", "ai-watchdog", "Watchdog active — module-scoped actions only");
  }
}

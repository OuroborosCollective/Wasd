/**
 * Optional "watchdog": sends recent client errors to Firebase AI Logic (Gemini) and runs
 * only whitelisted recovery actions. Does not modify server config or execute arbitrary code.
 *
 * Enable: VITE_FIREBASE_AI_WATCHDOG=1 (requires Firebase app + AI Logic setup in console).
 */
import { getFirebaseAppOrNull, isFirebaseClientConfigured } from "../auth/firebase";
import { reconnectGameSocket } from "../networking/websocketClient";
import {
  formatSnapshotForPrompt,
  getWatchdogLogSnapshot,
  pushWatchdogLog,
} from "./watchdogTelemetry";

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

type AgentAction =
  | { action: "none"; reason?: string }
  | { action: "clear_auth_storage"; reason?: string }
  | { action: "reconnect_websocket"; reason?: string }
  | { action: "reload_page"; reason?: string };

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m?.[1]) return m[1].trim();
  return t;
}

function parseAgentJson(raw: string): AgentAction | null {
  try {
    const s = stripJsonFence(raw);
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i < 0 || j <= i) return null;
    const obj = JSON.parse(s.slice(i, j + 1)) as Record<string, unknown>;
    const action = typeof obj.action === "string" ? obj.action : "";
    const reason = typeof obj.reason === "string" ? obj.reason : undefined;
    if (action === "none") return { action: "none", reason };
    if (action === "clear_auth_storage") return { action: "clear_auth_storage", reason };
    if (action === "reconnect_websocket") return { action: "reconnect_websocket", reason };
    if (action === "reload_page") return { action: "reload_page", reason };
    return null;
  } catch {
    return null;
  }
}

async function runGeminiDecision(logText: string): Promise<AgentAction | null> {
  const firebaseApp = getFirebaseAppOrNull();
  if (!firebaseApp) return null;

  const { getAI, getGenerativeModel, GoogleAIBackend } = await import("firebase/ai");

  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, { model: MODEL });

  const system = `You are a safety watchdog for a browser game client. You ONLY choose recovery actions from this exact JSON schema. No other actions exist.
Respond with a single JSON object only, no markdown, no code fences:
{"action":"none"|"clear_auth_storage"|"reconnect_websocket"|"reload_page","reason":"short"}

Rules:
- Use "clear_auth_storage" when logs indicate invalid/expired Firebase or WS auth token, or stale localStorage token.
- Use "reconnect_websocket" when connection/auth errors might be fixed by a fresh WebSocket after storage fix.
- Use "reload_page" ONLY if the client is likely stuck after token clear + reconnect would not help; use rarely.
- Use "none" if unsure, logs are benign, or the issue needs a human/server change.

Recent client logs:
${logText}`;

  const result = await model.generateContent(system);
  const text = result.response.text();
  return parseAgentJson(text);
}

function executeAction(act: AgentAction): void {
  if (act.action === "none") {
    pushWatchdogLog("info", "ai-watchdog", "No automated action (AI)", act.reason);
    return;
  }
  pushWatchdogLog("warn", "ai-watchdog", `Executing: ${act.action}`, act.reason);

  if (act.action === "clear_auth_storage") {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const { auth } = await import("../auth/firebase");
        const { signOut } = await import("firebase/auth");
        if (auth) await signOut(auth);
      } catch {
        /* ignore */
      }
    })();
  }

  if (act.action === "clear_auth_storage" || act.action === "reconnect_websocket") {
    window.setTimeout(() => reconnectGameSocket(), 400);
  }

  if (act.action === "reload_page") {
    const now = Date.now();
    if (now - reloadUsedAt < RELOAD_COOLDOWN_MS) {
      pushWatchdogLog("warn", "ai-watchdog", "reload_page skipped (cooldown)");
      return;
    }
    reloadUsedAt = now;
    window.setTimeout(() => location.reload(), 800);
  }
}

async function runWatchdogCycle(trigger: string): Promise<void> {
  if (!WATCHDOG_FLAG() || !isFirebaseClientConfigured()) return;

  const now = Date.now();
  if (now - lastAiRun < MIN_INTERVAL_MS) return;

  const snapshot = getWatchdogLogSnapshot();
  const recentErrors = snapshot.filter((e) => e.level === "error" && now - e.t < 120_000);
  if (recentErrors.length === 0) return;

  lastAiRun = now;
  pushWatchdogLog("info", "ai-watchdog", `Consulting model (${trigger})…`);

  try {
    const logText = formatSnapshotForPrompt(snapshot.slice(-40));
    const decision = await runGeminiDecision(logText);
    if (!decision) {
      pushWatchdogLog("warn", "ai-watchdog", "Could not parse AI response");
      return;
    }
    executeAction(decision);
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
    pushWatchdogLog("info", "ai-watchdog", "Watchdog active (Firebase AI Logic)");
  }
}

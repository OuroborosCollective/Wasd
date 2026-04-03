/** Functional area for scoped recovery (AI may only pick actions allowed for this area). */
export type WatchdogModuleId = "network" | "renderer" | "firebase_auth" | "storage" | "unknown";

export type WatchdogLogEntry = {
  t: number;
  level: "error" | "warn" | "info";
  source: string;
  message: string;
  detail?: string;
  /** Best-effort classification for this line (used when aggregating recent errors). */
  moduleHint?: WatchdogModuleId;
};

const MAX = 80;
const buffer: WatchdogLogEntry[] = [];

export function inferWatchdogModule(source: string, message: string, detail?: string): WatchdogModuleId {
  const blob = `${source} ${message} ${detail ?? ""}`.toLowerCase();
  if (source === "net" || /\bwebsocket\b|\b\/ws\b|connection.*refused|network error/i.test(blob)) {
    return "network";
  }
  if (
    /\bwebgl\b|\bbabylon\b|\bcontext lost\b|\bwgpu\b|\bshader\b|\bgpu\b|three\.|engine\.|texture.*fail/i.test(
      blob
    )
  ) {
    return "renderer";
  }
  if (/\bfirebase\b|\bgetidtoken\b|\bid token\b|sign.?in|auth\/|invalid.*token/i.test(blob)) {
    return "firebase_auth";
  }
  if (/\blocalstorage\b|\bstorage\b|quota/i.test(blob)) {
    return "storage";
  }
  return "unknown";
}

export function pushWatchdogLog(
  level: WatchdogLogEntry["level"],
  source: string,
  message: string,
  detail?: string,
  moduleHint?: WatchdogModuleId
): void {
  const hint = moduleHint ?? inferWatchdogModule(source, message, detail);
  buffer.push({
    t: Date.now(),
    level,
    source,
    message: message.slice(0, 2000),
    detail: detail?.slice(0, 4000),
    moduleHint: hint,
  });
  while (buffer.length > MAX) buffer.shift();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("areloria:watchdog-log", {
        detail: buffer[buffer.length - 1],
      })
    );
  }
}

export function getWatchdogLogSnapshot(): WatchdogLogEntry[] {
  return buffer.slice();
}

/** Dominant module among recent errors (last 2 min), by severity-weighted vote. */
export function inferDominantModuleFromSnapshot(entries: WatchdogLogEntry[]): WatchdogModuleId {
  const now = Date.now();
  const windowMs = 120_000;
  const scores: Partial<Record<WatchdogModuleId, number>> = {};
  for (const e of entries) {
    if (e.level !== "error" && e.level !== "warn") continue;
    if (now - e.t > windowMs) continue;
    const m = e.moduleHint ?? inferWatchdogModule(e.source, e.message, e.detail);
    const w = e.level === "error" ? 2 : 1;
    scores[m] = (scores[m] ?? 0) + w;
  }
  let best: WatchdogModuleId = "unknown";
  let max = 0;
  for (const k of Object.keys(scores) as WatchdogModuleId[]) {
    const v = scores[k] ?? 0;
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

export function formatSnapshotForPrompt(entries: WatchdogLogEntry[]): string {
  return entries
    .map((e) => {
      const time = new Date(e.t).toISOString();
      const d = e.detail ? ` | ${e.detail.replace(/\s+/g, " ").slice(0, 400)}` : "";
      return `[${time}] ${e.level.toUpperCase()} ${e.source}: ${e.message}${d}`;
    })
    .join("\n");
}

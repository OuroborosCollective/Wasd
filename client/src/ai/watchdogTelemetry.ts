export type WatchdogLogEntry = {
  t: number;
  level: "error" | "warn" | "info";
  source: string;
  message: string;
  detail?: string;
};

const MAX = 80;
const buffer: WatchdogLogEntry[] = [];

export function pushWatchdogLog(
  level: WatchdogLogEntry["level"],
  source: string,
  message: string,
  detail?: string
): void {
  buffer.push({
    t: Date.now(),
    level,
    source,
    message: message.slice(0, 2000),
    detail: detail?.slice(0, 4000),
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

export function formatSnapshotForPrompt(entries: WatchdogLogEntry[]): string {
  return entries
    .map((e) => {
      const time = new Date(e.t).toISOString();
      const d = e.detail ? ` | ${e.detail.replace(/\s+/g, " ").slice(0, 400)}` : "";
      return `[${time}] ${e.level.toUpperCase()} ${e.source}: ${e.message}${d}`;
    })
    .join("\n");
}

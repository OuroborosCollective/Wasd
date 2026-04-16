import { GameConfig } from "./GameConfig.js";

/** Optional override via `WS_MAX_MESSAGE_BYTES` (DGCC / ops). */
export function resolveWsMaxMessageBytes(): number {
  const raw = process.env.WS_MAX_MESSAGE_BYTES?.trim();
  if (!raw) return GameConfig.wsMaxMessageBytes;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : GameConfig.wsMaxMessageBytes;
}

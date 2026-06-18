import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { isCausalCatchupEventType } from "./CausalCatchupTypes.js";

function hashHex(parts) {
  return stableHash32(parts.map((part) => String(part)).join("|")).toString(16).padStart(8, "0");
}

export function compressCausalCatchup(events) {
  const normalized = (events ?? [])
    .filter((event) => event && isCausalCatchupEventType(event.type) && String(event.eventId ?? "").trim())
    .map((event) => Object.freeze({
      eventId: String(event.eventId).trim(),
      type: event.type,
      tick: Number.isSafeInteger(event.tick) && event.tick >= 0 ? event.tick : 0,
      significancePerMille: Number.isFinite(event.significancePerMille) ? Math.max(0, Math.min(1000, Math.floor(event.significancePerMille))) : 0,
      regionId: String(event.regionId ?? "").trim(),
      chunkKey: String(event.chunkKey ?? "").trim(),
    }))
    .sort((a, b) => a.tick - b.tick || b.significancePerMille - a.significancePerMille || a.eventId.localeCompare(b.eventId));
  return Object.freeze({
    eventCount: normalized.length,
    events: Object.freeze(normalized),
    summaryHash: hashHex(normalized.flatMap((event) => [event.eventId, event.type, event.tick, event.significancePerMille, event.regionId, event.chunkKey])),
  });
}

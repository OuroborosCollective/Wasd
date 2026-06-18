import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { createRegionLodState } from "./RegionLodState.js";
import { REGION_PRESSURE_FIELDS, REGION_PRESSURE_KAPPA } from "./RegionPressureTypes.js";

function clampPerMille(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(REGION_PRESSURE_KAPPA, Math.floor(value))) : 0;
}

function normalizeSignal(signal) {
  if (!signal || signal.support !== "supported") {
    return Object.freeze({ valuePerMille: 0, support: "not_supported_yet" });
  }
  return Object.freeze({ valuePerMille: clampPerMille(signal.valuePerMille), support: "supported" });
}

function pickSignal(input, field) {
  return normalizeSignal(
    input.resourceSignals?.[field]
      ?? input.marketSignals?.[field]
      ?? input.npcSignals?.[field]
      ?? input.governanceSignals?.[field],
  );
}

function hashHex(parts) {
  return stableHash32(parts.map((part) => String(part)).join("|")).toString(16).padStart(8, "0");
}

export function planRegionPressure(input) {
  const lod = createRegionLodState({
    tick: input.tick,
    regionId: input.regionId,
    chunkKeys: input.chunkKeys,
    distanceChunks: input.distanceChunks,
  });
  const values = Object.fromEntries(REGION_PRESSURE_FIELDS.map((field) => [field, pickSignal(input, field)]));
  const rawAggregate = REGION_PRESSURE_FIELDS.reduce((sum, field) => sum + values[field].valuePerMille, 0);
  const aggregatePressurePerMille = clampPerMille(rawAggregate / REGION_PRESSURE_FIELDS.length);
  const stateHash = hashHex([
    lod.tick,
    lod.regionId,
    lod.lodTier,
    lod.chunkKeys.join(","),
    ...REGION_PRESSURE_FIELDS.flatMap((field) => [field, values[field].valuePerMille, values[field].support]),
    aggregatePressurePerMille,
  ]);
  return Object.freeze({ ...lod, ...values, aggregatePressurePerMille, stateHash });
}

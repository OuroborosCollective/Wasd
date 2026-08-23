/**
 * AREUnboundedProgression
 *
 * Exact, cap-free skill progression for Arelorian.
 *
 * Truth-path rules:
 * - XP and level truth use bigint, never floating-point counters.
 * - Persistence/UI boundaries use canonical base-10 strings for exact values.
 * - The historical Arelorian curve floor(50 * level^1.4) is preserved exactly
 *   as floor(fifthRoot(50^5 * level^7)).
 * - No MAX_LEVEL or safety ceiling exists in the canonical progression state.
 */

export type ExactIntegerInput = string | number | bigint;

export interface AREUnboundedProgressionState {
  readonly totalXp: bigint;
  readonly level: bigint;
  readonly xpIntoLevel: bigint;
}

export interface AREUnboundedProgressionAdvance {
  readonly state: AREUnboundedProgressionState;
  readonly xpApplied: bigint;
  readonly levelsGained: bigint;
}

export interface SafeNumberProjection {
  readonly value: number;
  readonly exact: boolean;
}

const XP_CURVE_BASE = 50n;
const XP_CURVE_NUMERATOR = 7n;
const XP_CURVE_DENOMINATOR = 5n;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export function parseExactNonNegativeInteger(value: ExactIntegerInput, fieldName = 'value'): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error(`${fieldName} must be non-negative`);
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${fieldName} number input must be a non-negative safe integer`);
    }
    return BigInt(value);
  }

  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${fieldName} must be a canonical non-negative base-10 integer`);
  }

  return BigInt(value);
}

export function exactIntegerString(value: ExactIntegerInput): string {
  return parseExactNonNegativeInteger(value).toString(10);
}

/**
 * Legacy/read-model projection only. `exact=false` means the bigint truth is
 * larger than JavaScript can represent exactly; callers must use the exact
 * string field instead of treating this projection as authority.
 */
export function projectExactToSafeNumber(value: ExactIntegerInput): SafeNumberProjection {
  const exact = parseExactNonNegativeInteger(value);
  if (exact <= MAX_SAFE_BIGINT) {
    return { value: Number(exact), exact: true };
  }
  return { value: Number.MAX_SAFE_INTEGER, exact: false };
}

/**
 * Exact XP required to advance from `level` to `level + 1`.
 *
 * Historical formula: floor(50 * level^1.4)
 * Exact integer form: floor((50^5 * level^7)^(1/5))
 */
export function xpRequiredForNextLevelExact(level: ExactIntegerInput): bigint {
  const parsed = parseExactNonNegativeInteger(level, 'level');
  const safeLevel = parsed < 1n ? 1n : parsed;
  const radicand = (XP_CURVE_BASE ** XP_CURVE_DENOMINATOR) * (safeLevel ** XP_CURVE_NUMERATOR);
  const result = integerNthRootFloor(radicand, XP_CURVE_DENOMINATOR);
  return result < 1n ? 1n : result;
}

export function createInitialProgressionState(): AREUnboundedProgressionState {
  return Object.freeze({ totalXp: 0n, level: 1n, xpIntoLevel: 0n });
}

export function normalizeProgressionState(input: {
  totalXp: ExactIntegerInput;
  level: ExactIntegerInput;
  xpIntoLevel: ExactIntegerInput;
}): AREUnboundedProgressionState {
  const totalXp = parseExactNonNegativeInteger(input.totalXp, 'totalXp');
  const parsedLevel = parseExactNonNegativeInteger(input.level, 'level');
  const level = parsedLevel < 1n ? 1n : parsedLevel;
  const xpIntoLevel = parseExactNonNegativeInteger(input.xpIntoLevel, 'xpIntoLevel');
  const needed = xpRequiredForNextLevelExact(level);

  if (xpIntoLevel >= needed) {
    throw new Error('xpIntoLevel must be smaller than the XP required for the current level');
  }
  if (xpIntoLevel > totalXp) {
    throw new Error('xpIntoLevel cannot exceed totalXp');
  }

  return Object.freeze({ totalXp, level, xpIntoLevel });
}

/**
 * Apply XP using only explicit progression state. The result is independent of
 * process history, wall-clock time, cache contents, or hidden counters.
 */
export function advanceUnboundedProgression(
  current: AREUnboundedProgressionState,
  gainedXp: ExactIntegerInput,
): AREUnboundedProgressionAdvance {
  const state = normalizeProgressionState(current);
  const xpApplied = parseExactNonNegativeInteger(gainedXp, 'gainedXp');

  if (xpApplied === 0n) {
    return Object.freeze({ state, xpApplied, levelsGained: 0n });
  }

  let level = state.level;
  let xpIntoLevel = state.xpIntoLevel;
  let remaining = xpApplied;
  let levelsGained = 0n;

  while (remaining > 0n) {
    const required = xpRequiredForNextLevelExact(level);
    const needed = required - xpIntoLevel;

    if (remaining < needed) {
      xpIntoLevel += remaining;
      remaining = 0n;
      break;
    }

    remaining -= needed;
    level += 1n;
    levelsGained += 1n;
    xpIntoLevel = 0n;
  }

  return Object.freeze({
    state: Object.freeze({
      totalXp: state.totalXp + xpApplied,
      level,
      xpIntoLevel,
    }),
    xpApplied,
    levelsGained,
  });
}

/**
 * Legacy migration helper for number-era saves that stored total XP only.
 * This is intentionally not used on the hot tick path. New saves persist
 * xpIntoLevel explicitly and therefore never need to replay their whole level
 * history on load.
 */
export function progressionFromLegacyTotalXp(totalXp: ExactIntegerInput): AREUnboundedProgressionState {
  const total = parseExactNonNegativeInteger(totalXp, 'totalXp');
  let remaining = total;
  let level = 1n;

  while (remaining > 0n) {
    const required = xpRequiredForNextLevelExact(level);
    if (remaining < required) break;
    remaining -= required;
    level += 1n;
  }

  return Object.freeze({ totalXp: total, level, xpIntoLevel: remaining });
}

/**
 * Integer nth-root, rounded down. Binary search keeps behavior identical on
 * every JavaScript runtime and avoids Math.pow/Math.sqrt in progression truth.
 */
function integerNthRootFloor(value: bigint, degree: bigint): bigint {
  if (value < 0n) throw new Error('integer root input must be non-negative');
  if (degree <= 0n) throw new Error('integer root degree must be positive');
  if (value < 2n || degree === 1n) return value;

  let low = 0n;
  let high = 1n;

  while ((high ** degree) <= value) {
    high <<= 1n;
  }

  while (low + 1n < high) {
    const mid = (low + high) >> 1n;
    const powered = mid ** degree;
    if (powered <= value) low = mid;
    else high = mid;
  }

  return low;
}

/**
 * ARELORIA CORE: Kappa Math Kernel
 * DIRECTIVE: Ouroboros Grand Unification / ARE-Logic
 *
 * Authoritative core math uses fixed-point integer values only.
 * Rendering and display layers may convert values back for presentation,
 * but simulation truth must stay integer-safe and deterministic.
 */

export const KAPPA = 1000 as const;
export type KappaInt = number;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
const KAPPA_BIG = BigInt(KAPPA);

export function assertSafeInteger(value: number, operation: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`[ARE-Guard] Float detected in ${operation}: ${value}. Only integers allowed.`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error(`[ARE-Guard] Unsafe integer in ${operation}: ${value}.`);
  }
}

function assertFiniteInput(value: number, operation: string): void {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`[ARE-Guard] Invalid number input in ${operation}: ${value}.`);
  }
}

function fromBigInt(value: bigint, operation: string): KappaInt {
  if (value > MAX_SAFE || value < MIN_SAFE) {
    throw new Error(`[ARE-Guard] Unsafe integer overflow in ${operation}: ${value.toString()}.`);
  }
  return Number(value);
}

/**
 * Converts external decimal input into the authoritative kappa integer scale.
 * Decimal input is allowed only at this boundary.
 */
export function toKappa(value: number): KappaInt {
  assertFiniteInput(value, 'toKappa');
  const scaled = Math.round(value * KAPPA);
  assertSafeInteger(scaled, 'toKappa');
  return scaled;
}

/**
 * Converts kappa integer values back to decimal values for display/debug only.
 */
export function fromKappaInt(value: KappaInt): number {
  assertSafeInteger(value, 'fromKappaInt');
  return value / KAPPA;
}

export function kAdd(a: KappaInt, b: KappaInt): KappaInt {
  assertSafeInteger(a, 'kAdd arg a');
  assertSafeInteger(b, 'kAdd arg b');
  return fromBigInt(BigInt(a) + BigInt(b), 'kAdd result');
}

export function kSub(a: KappaInt, b: KappaInt): KappaInt {
  assertSafeInteger(a, 'kSub arg a');
  assertSafeInteger(b, 'kSub arg b');
  return fromBigInt(BigInt(a) - BigInt(b), 'kSub result');
}

/**
 * Multiplies two fixed-point values using integer arithmetic.
 * BigInt division truncates toward zero, avoiding value creation by rounding up.
 */
export function kMul(a: KappaInt, b: KappaInt): KappaInt {
  assertSafeInteger(a, 'kMul arg a');
  assertSafeInteger(b, 'kMul arg b');
  return fromBigInt((BigInt(a) * BigInt(b)) / KAPPA_BIG, 'kMul result');
}

/**
 * Divides two fixed-point values using integer arithmetic.
 * BigInt division truncates toward zero, avoiding value creation by rounding up.
 */
export function kDiv(a: KappaInt, b: KappaInt): KappaInt {
  assertSafeInteger(a, 'kDiv arg a');
  assertSafeInteger(b, 'kDiv arg b');
  if (b === 0) {
    throw new Error('[ARE-Guard] Division by zero is strictly prohibited.');
  }
  return fromBigInt((BigInt(a) * KAPPA_BIG) / BigInt(b), 'kDiv result');
}

/**
 * ARE Deterministic Time Utilities
 * 
 * Provides deterministic timestamp generation for observability.
 * Uses an incrementing counter instead of wall-clock time to maintain
 * ARE determinism while preserving timestamp semantics.
 * 
 * @ARE-GUARD-EXEMPT: Deterministic time utilities for observability only.
 */

// Deterministic tick counter for timestamp generation
let _areTimestampCounter = 0;

/**
 * Get deterministic timestamp (increments each call)
 * @ARE-DETERMINISM-ALLOW: internal counter for deterministic time only
 */
export function getDeterministicTimestamp(): number {
  return ++_areTimestampCounter;
}

/**
 * Get deterministic date string (ISO format with counter)
 * @ARE-DETERMINISM-ALLOW: deterministic ISO format without wall-clock
 */
export function getDeterministicISOTime(): string {
  // Deterministic ISO format without Date object
  const ts = _areTimestampCounter.toString().padStart(13, '0');
  const year = 1970;
  const month = '01';
  const day = '01';
  const hours = '00';
  const mins = '00';
  const secs = '00';
  const ms = ts.slice(-3);
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}.${ms}Z`;
}

/**
 * Reset counter (for testing)
 */
export function resetDeterministicTime(): void {
  _areTimestampCounter = 0;
}

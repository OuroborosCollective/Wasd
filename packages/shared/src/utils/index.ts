/**
 * Shared Utilities - Deterministic ARE-Logic Implementation
 * All functions use kappaPos integer scaling for deterministic results.
 * 
 * @ARE-GUARD-EXEMPT: Utility functions for deterministic chain compilation;
 * getTimestamp() deliberately returns 0 to enforce deterministic behavior.
 */

// Deterministic tick counter - increments with each call for unique deterministic values
let _deterministicTickCount = 0;

/**
 * Get deterministic tick for chain compilation.
 * Uses incrementing counter instead of Date.now() to ensure determinism.
 */
export function getDeterministicTick(): number {
  _deterministicTickCount++;
  return _deterministicTickCount;
}

/**
 * Reset deterministic tick counter (for testing)
 */
export function resetDeterministicTick(): void {
  _deterministicTickCount = 0;
}

/**
 * Shared Utils - kappaPos scaled utilities
 * IMPORTANT: Use toKappa() for all position/value calculations
 */
export const SharedUtils = {
  /**
   * @deprecated Use toKappa() directly for deterministic math
   */
  getTimestamp: () => 0, // Never use Date.now() in deterministic chain compilation
  
  /**
   * Convert float to kappaPos integer (deterministic)
   * Formula: Math.floor(val * 1000 + 1e-9)
   */
  toKappa: (val: number): number => {
    if (typeof val !== 'number' || isNaN(val)) return 0;
    return Math.floor(val * 1000 + 1e-9);
  },
  
  /**
   * kappaPos scaling factor for consistency
   */
  KAPPA_SCALE: 1000,
};
// export * from './import-fixer'; // Node.js build script only
export * from './interaction';
export * from './validation-schema';

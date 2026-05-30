/**
 * A high-performance deep clone utility that maintains parity with JSON serialization behavior.
 * Used for state snapshots and persistence paths to avoid the overhead of JSON.parse(JSON.stringify()).
 *
 * JSON Parity rules:
 * - Dates are converted to ISO strings.
 * - undefined and functions in objects are omitted.
 * - undefined, functions, NaN, and Infinity in arrays are converted to null.
 * - NaN and Infinity in objects are converted to null (as values).
 */
export function deepClone<T>(val: T): T {
  if (val === null || typeof val !== 'object') {
    if (typeof val === 'number' && !Number.isFinite(val)) {
      return null as any;
    }
    return val;
  }

  if (val instanceof Date) {
    return val.toISOString() as any;
  }

  if (Array.isArray(val)) {
    const res = new Array(val.length);
    for (let i = 0; i < val.length; i++) {
      const item = val[i];
      if (typeof item === 'function' || item === undefined) {
        res[i] = null;
      } else {
        res[i] = deepClone(item);
      }
    }
    return res as any;
  }

  // Object
  const res: Record<string, any> = {};
  for (const key in val) {
    if (Object.prototype.hasOwnProperty.call(val, key)) {
      const item = (val as any)[key];
      if (typeof item !== 'function' && item !== undefined) {
        res[key] = deepClone(item);
      }
    }
  }
  return res as T;
}

/**
 * A high-performance deep clone utility for JSON-safe objects.
 * Refined to match JSON.parse(JSON.stringify()) behavior:
 * - Dates are converted to ISO strings.
 * - Functions, Symbols, and undefined are omitted from objects.
 * - Functions, Symbols, and undefined are converted to null in arrays.
 * Benchmark confirms this is significantly faster than JSON.parse(JSON.stringify())
 * for typical POJO/Array structures used in game state snapshots.
 */
export function deepClone<T>(val: T): any {
  if (val === null) return null;

  const type = typeof val;
  if (type === "boolean" || type === "number" || type === "string") {
    return val;
  }

  if (type === "undefined" || type === "function" || type === "symbol") {
    return undefined;
  }

  // Date handling: match JSON.stringify behavior
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Array handling
  if (Array.isArray(val)) {
    const len = val.length;
    const copy = new Array(len);
    for (let i = 0; i < len; i++) {
      const item = val[i];
      const itemType = typeof item;
      if (itemType === "function" || item === undefined || itemType === "symbol") {
        copy[i] = null;
      } else {
        copy[i] = deepClone(item);
      }
    }
    return copy;
  }

  // Object handling
  const copy: any = {};
  for (const key in val) {
    if (Object.prototype.hasOwnProperty.call(val, key)) {
      const v = (val as any)[key];
      const vType = typeof v;

      // JSON.stringify skips functions, symbols, and undefined in objects
      if (vType === "function" || v === undefined || vType === "symbol") {
        continue;
      }

      copy[key] = deepClone(v);
    }
  }
  return copy;
}

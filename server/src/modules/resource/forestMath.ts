export function forestMath(parts: (string | number | null | undefined)[]): number {
  let value = 2166136261;
  for (const part of parts) {
    const text = String(part ?? "");
    for (let i = 0; i < text.length; i += 1) {
      value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    }
    value = Math.imul(value ^ 1249, 16777619);
  }
  return value >>> 0;
}

export function forestWhole(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

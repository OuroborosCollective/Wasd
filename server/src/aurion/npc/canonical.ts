export function stableCatalogStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableCatalogStringify).join(",")}]`;
  const valueRecord = value as Record<string, unknown>;
  return `{${Object.keys(valueRecord).sort().map(key => `${JSON.stringify(key)}:${stableCatalogStringify(valueRecord[key])}`).join(",")}}`;
}

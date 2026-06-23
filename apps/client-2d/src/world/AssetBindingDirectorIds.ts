import type { AssetEntry } from "../assetManifest";
import type { AssetBindingContext } from "./AssetBindingContext";
import type { SemanticQuery } from "./AssetSemanticProfiles";
import { combineSeed, hash32 } from "./DeterministicAssetRng";

export function deterministicAssetBindingId(entry: AssetEntry, query: SemanticQuery, context: AssetBindingContext): string {
  const explicit = String(entry.id ?? "").trim();
  if (explicit.length > 0) return explicit;

  const material = combineSeed(
    String(context.seed),
    query.semanticType,
    query.kind ?? "semantic",
    entry.src ?? "missing-src",
    entry.sourcePath ?? "missing-source-path",
    entry.sourceName ?? "missing-source-name",
    entry.kind ?? "missing-kind",
    entry.group ?? "missing-group",
  );

  return `asset:${hash32(material).toString(16).padStart(8, "0")}`;
}

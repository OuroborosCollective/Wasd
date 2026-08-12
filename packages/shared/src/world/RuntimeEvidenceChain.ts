/**
 * Runtime evidence chain & 2D/3D parity contract (CloudCraft #2469).
 *
 * Defines the minimal evidence chain: Unit → Guard → Build → Browser →
 * Snapshot/Hash-Readback. Each layer must produce real evidence (exit
 * code, parsed report, deterministic calculation) — never fake success.
 *
 * The 2D/3D parity contract: both renderers may have different display,
 * but must derive truth from the same WorldOverlayModel. They must not
 * have different truth for the same authoritative fact.
 */

export type EvidenceLayer =
  | "unit"
  | "guard"
  | "build"
  | "browser"
  | "snapshot-hash-readback";

export type EvidenceStatus = "pass" | "fail" | "skipped" | "build-only";

export interface EvidenceEntry {
  readonly layer: EvidenceLayer;
  readonly name: string;
  readonly status: EvidenceStatus;
  readonly detail: string;
  readonly timestamp: string;
}

export interface EvidenceChain {
  readonly revision: string;
  readonly entries: readonly EvidenceEntry[];
  readonly overallStatus: EvidenceStatus;
}

/**
 * Readback points: the exact revision, snapshot, and hash that the
 * evidence chain refers to. Evidence must reference the tested stand.
 */
export interface ReadbackPoint {
  readonly label: string;
  readonly value: string;
  readonly source: string;
}

/**
 * Build an evidence chain from entries. The overall status is `pass`
 * only if no entry is `fail`. `build-only` entries do not count as
 * runtime success — they are explicitly marked.
 */
export function buildEvidenceChain(
  revision: string,
  entries: readonly EvidenceEntry[],
): EvidenceChain {
  const hasFail = entries.some((e) => e.status === "fail");
  const hasRuntimePass = entries.some(
    (e) => e.status === "pass" && (e.layer === "browser" || e.layer === "snapshot-hash-readback"),
  );
  const overallStatus: EvidenceStatus = hasFail
    ? "fail"
    : hasRuntimePass
      ? "pass"
      : "build-only";
  return Object.freeze({ revision, entries: Object.freeze([...entries]), overallStatus });
}

/**
 * Parity contract: both 2D and 3D renderers must implement this to prove
 * they derive truth from the same WorldOverlayModel, not from separate
 * truth sources.
 */
export interface OverlayRendererParityContract {
  readonly rendererId: "client-2d" | "client-3d";
  readonly consumesWorldOverlayModel: boolean;
  readonly truthSource: "server-snapshot" | "local-invented" | "none";
  readonly derivesFromDerivation: boolean;
  readonly displayMayDiffer: boolean;
}

/**
 * Verify that two renderers have parity: same truth source, both consume
 * the WorldOverlayModel, both derive from the shared derivation. Display
 * may differ, but truth must not.
 */
export function verifyParity(
  rendererA: OverlayRendererParityContract,
  rendererB: OverlayRendererParityContract,
): { parity: boolean; reason: string | null } {
  if (rendererA.rendererId === rendererB.rendererId) {
    return { parity: false, reason: "same_renderer_id" };
  }
  if (!rendererA.consumesWorldOverlayModel || !rendererB.consumesWorldOverlayModel) {
    return { parity: false, reason: "renderer_does_not_consume_overlay_model" };
  }
  if (rendererA.truthSource !== "server-snapshot" || rendererB.truthSource !== "server-snapshot") {
    return { parity: false, reason: `truth_source_not_server_snapshot:${rendererA.truthSource}:${rendererB.truthSource}` };
  }
  if (!rendererA.derivesFromDerivation || !rendererB.derivesFromDerivation) {
    return { parity: false, reason: "renderer_does_not_derive_from_shared_derivation" };
  }
  // Display may differ — that's allowed.
  return { parity: true, reason: null };
}

/**
 * Expected parity contracts for the integrated CloudCraft slices.
 * These are the target contracts that the 2D and 3D clients must
 * satisfy once #2464/#2465 are merged.
 */
export const EXPECTED_PARITY_CONTRACTS = Object.freeze({
  "client-2d": {
    rendererId: "client-2d" as const,
    consumesWorldOverlayModel: true,
    truthSource: "server-snapshot" as const,
    derivesFromDerivation: true,
    displayMayDiffer: true,
  },
  "client-3d": {
    rendererId: "client-3d" as const,
    consumesWorldOverlayModel: true,
    truthSource: "server-snapshot" as const,
    derivesFromDerivation: true,
    displayMayDiffer: true,
  },
} as const);

/**
 * Evidence layers that count as runtime success (not build-only).
 */
export const RUNTIME_EVIDENCE_LAYERS: readonly EvidenceLayer[] = Object.freeze([
  "browser",
  "snapshot-hash-readback",
]);

/**
 * Check if an evidence layer is runtime (not build-only).
 */
export function isRuntimeEvidenceLayer(layer: EvidenceLayer): boolean {
  return RUNTIME_EVIDENCE_LAYERS.includes(layer);
}

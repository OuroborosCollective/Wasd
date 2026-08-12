import { describe, expect, it } from "vitest";
import {
  EXPECTED_PARITY_CONTRACTS,
  RUNTIME_EVIDENCE_LAYERS,
  buildEvidenceChain,
  isRuntimeEvidenceLayer,
  verifyParity,
  type EvidenceEntry,
  type EvidenceLayer,
  type OverlayRendererParityContract,
} from "./RuntimeEvidenceChain";

function makeEntry(layer: EvidenceEntry["layer"], status: EvidenceEntry["status"], name: string): EvidenceEntry {
  return { layer, name, status, detail: "", timestamp: "2026-08-11T15:00:00Z" };
}

describe("RuntimeEvidenceChain", () => {
  it("reports fail if any entry fails", () => {
    const chain = buildEvidenceChain("abc123", [
      makeEntry("unit", "pass", "unit-tests"),
      makeEntry("guard", "fail", "determinism-guard"),
    ]);
    expect(chain.overallStatus).toBe("fail");
  });

  it("reports build-only if only unit/guard/build pass (no runtime layer)", () => {
    const chain = buildEvidenceChain("abc123", [
      makeEntry("unit", "pass", "unit-tests"),
      makeEntry("guard", "pass", "determinism-guard"),
      makeEntry("build", "pass", "shared-build"),
    ]);
    expect(chain.overallStatus).toBe("build-only");
  });

  it("reports pass when a runtime layer (browser/snapshot-hash) passes", () => {
    const chain = buildEvidenceChain("abc123", [
      makeEntry("unit", "pass", "unit-tests"),
      makeEntry("browser", "pass", "minimap-smoke"),
      makeEntry("snapshot-hash-readback", "pass", "hash-readback"),
    ]);
    expect(chain.overallStatus).toBe("pass");
  });

  it("freezes the chain and entries", () => {
    const chain = buildEvidenceChain("abc123", [makeEntry("unit", "pass", "x")]);
    expect(Object.isFrozen(chain)).toBe(true);
    expect(Object.isFrozen(chain.entries)).toBe(true);
  });

  it("identifies runtime evidence layers", () => {
    expect(isRuntimeEvidenceLayer("browser")).toBe(true);
    expect(isRuntimeEvidenceLayer("snapshot-hash-readback")).toBe(true);
    expect(isRuntimeEvidenceLayer("unit")).toBe(false);
    expect(isRuntimeEvidenceLayer("build")).toBe(false);
  });
});

describe("verifyParity", () => {
  it("passes for two renderers with same server-snapshot truth source", () => {
    const a: OverlayRendererParityContract = {
      rendererId: "client-2d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const b: OverlayRendererParityContract = {
      rendererId: "client-3d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const result = verifyParity(a, b);
    expect(result.parity).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("fails if a renderer invents local truth", () => {
    const a: OverlayRendererParityContract = {
      rendererId: "client-2d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const b: OverlayRendererParityContract = {
      rendererId: "client-3d",
      consumesWorldOverlayModel: true,
      truthSource: "local-invented",
      derivesFromDerivation: false,
      displayMayDiffer: true,
    };
    const result = verifyParity(a, b);
    expect(result.parity).toBe(false);
    expect(result.reason).toContain("truth_source_not_server_snapshot");
  });

  it("fails if a renderer does not consume WorldOverlayModel", () => {
    const a: OverlayRendererParityContract = {
      rendererId: "client-2d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const b: OverlayRendererParityContract = {
      rendererId: "client-3d",
      consumesWorldOverlayModel: false,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const result = verifyParity(a, b);
    expect(result.parity).toBe(false);
    expect(result.reason).toContain("does_not_consume_overlay_model");
  });

  it("fails if comparing the same renderer id", () => {
    const a: OverlayRendererParityContract = {
      rendererId: "client-2d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const result = verifyParity(a, a);
    expect(result.parity).toBe(false);
    expect(result.reason).toBe("same_renderer_id");
  });

  it("expected parity contracts satisfy parity", () => {
    const result = verifyParity(
      EXPECTED_PARITY_CONTRACTS["client-2d"],
      EXPECTED_PARITY_CONTRACTS["client-3d"],
    );
    expect(result.parity).toBe(true);
  });

  it("allows display to differ between renderers", () => {
    const a: OverlayRendererParityContract = {
      rendererId: "client-2d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: true,
    };
    const b: OverlayRendererParityContract = {
      rendererId: "client-3d",
      consumesWorldOverlayModel: true,
      truthSource: "server-snapshot",
      derivesFromDerivation: true,
      displayMayDiffer: false,
    };
    // Display may differ — parity still holds even if one says false.
    const result = verifyParity(a, b);
    expect(result.parity).toBe(true);
  });

  it("requires both renderers to reject local-invented truth", () => {
    const contracts = [
      EXPECTED_PARITY_CONTRACTS["client-2d"],
      EXPECTED_PARITY_CONTRACTS["client-3d"],
    ];
    for (const c of contracts) {
      expect(c.truthSource).toBe("server-snapshot");
      expect(c.consumesWorldOverlayModel).toBe(true);
      expect(c.derivesFromDerivation).toBe(true);
    }
  });

  it("runtime evidence layers are disjoint from build-only layers", () => {
    const buildOnly: EvidenceLayer[] = ["unit", "guard", "build"];
    const runtime: EvidenceLayer[] = [...RUNTIME_EVIDENCE_LAYERS];
    for (const b of buildOnly) {
      expect(runtime).not.toContain(b);
    }
    expect(runtime.length).toBe(2);
  });
});

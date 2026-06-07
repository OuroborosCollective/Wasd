import { describe, expect, it } from "vitest";
import { createHealPatchLogEntry, stableHealHash } from "./SelfHealPatchLog.js";

describe("SelfHealPatchLog", () => {
  it("hashes objects deterministically regardless of key order", () => {
    const left = stableHealHash({ b: 2, a: { y: 2, x: 1 } });
    const right = stableHealHash({ a: { x: 1, y: 2 }, b: 2 });

    expect(left).toBe(right);
  });

  it("creates reproducible patch entries", () => {
    const input = {
      tick: 42,
      signal: "ENTRYPOINT_CONTRACT_DRIFT" as const,
      subsystem: "client-entrypoints",
      action: "report_degraded",
      before: { status: "missing", path: "/2d" },
      after: { status: "degraded", path: "/2d" },
      ok: false,
    };

    const first = createHealPatchLogEntry(input);
    const second = createHealPatchLogEntry(input);

    expect(first).toEqual(second);
    expect(first.id).toHaveLength(64);
    expect(first.beforeHash).toHaveLength(64);
    expect(first.afterHash).toHaveLength(64);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { compressCausalCatchup } from "../gameplay/CausalCatchupCompressor.js";

describe("CausalCatchupCompressor", () => {
  it("does not invent events for an empty list", () => {
    const summary = compressCausalCatchup([]);
    expect(summary.eventCount).toBe(0);
    expect(summary.events).toEqual([]);
  });
});

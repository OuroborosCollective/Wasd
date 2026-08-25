import { describe, expect, it } from "vitest";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";

describe("WorldTick Thin Shell persistence boundary", () => {
  it("does not invent a persistence backend when no canonical runtime provider is registered", () => {
    expect(worldTickAdapter.persistence.getStatus()).toEqual(expect.objectContaining({
      id: "PersistenceRuntimePort",
      available: false,
      authority: "unavailable",
    }));
  });
});

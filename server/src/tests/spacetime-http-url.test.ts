import { describe, it, expect } from "vitest";
import { buildSpacetimeSqlUrl, spacetimeWsToHttpBase } from "../modules/spacetime/spacetimeHttpUrl.js";

describe("spacetimeWsToHttpBase", () => {
  it("maps wss to https and strips path", () => {
    expect(spacetimeWsToHttpBase("wss://db.example.com/v1/foo")).toBe("https://db.example.com");
  });
  it("maps ws to http", () => {
    expect(spacetimeWsToHttpBase("ws://127.0.0.1:3004")).toBe("http://127.0.0.1:3004");
  });
});

describe("buildSpacetimeSqlUrl", () => {
  it("encodes database name in path", () => {
    expect(buildSpacetimeSqlUrl("https://h", "areloria/glb")).toBe("https://h/v1/database/areloria%2Fglb/sql");
  });
});

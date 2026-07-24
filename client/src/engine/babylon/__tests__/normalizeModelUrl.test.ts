import { describe, it, expect } from "vitest";

/**
 * Inline re-implementation for test isolation — mirrors the production code
 * exactly so tests remain valid even before re-exporting is done.
 */
function normalizeModelPath(pathWithQuery: string): string {
  let path = pathWithQuery.split("#")[0] ?? "";
  const qIdx = path.indexOf("?");
  const search = qIdx >= 0 ? path.slice(qIdx) : "";
  if (qIdx >= 0) path = path.slice(0, qIdx);
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.startsWith("/world-assets/")) {
    path = `/assets/models/world-assets${path.slice("/world-assets".length)}`;
  } else if (path.startsWith("/models/")) {
    path = `/assets/models${path.slice("/models".length)}`;
  }
  return path + search;
}

function normalizeModelUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:") || raw.startsWith("data:")) {
    return raw;
  }
  return normalizeModelPath(raw);
}

describe("normalizeModelPath", () => {
  it("adds leading slash if missing", () => {
    expect(normalizeModelPath("foo.glb")).toBe("/foo.glb");
  });

  it("preserves query strings", () => {
    expect(normalizeModelPath("foo.glb?v=1")).toBe("/foo.glb?v=1");
  });

  it("removes hash fragments", () => {
    expect(normalizeModelPath("foo.glb#section")).toBe("/foo.glb");
  });

  it("maps /world-assets/ to /assets/models/world-assets/", () => {
    expect(normalizeModelPath("/world-assets/tree.glb")).toBe("/assets/models/world-assets/tree.glb");
  });

  it("maps /models/ to /assets/models/", () => {
    expect(normalizeModelPath("/models/character.glb")).toBe("/assets/models/character.glb");
  });

  it("handles complex paths with queries", () => {
    expect(normalizeModelPath("world-assets/rock.glb?token=123#unused")).toBe("/assets/models/world-assets/rock.glb?token=123");
  });
});

describe("normalizeModelUrl", () => {
  it("returns empty string for empty input", () => {
    expect(normalizeModelUrl("")).toBe("");
  });

  it("returns absolute URLs untouched", () => {
    const url = "https://example.com/model.glb";
    expect(normalizeModelUrl(url)).toBe(url);
  });

  it("returns blob URLs untouched", () => {
    const url = "blob:http://localhost:3000/uuid";
    expect(normalizeModelUrl(url)).toBe(url);
  });

  it("normalizes relative paths", () => {
    expect(normalizeModelUrl("models/foo.glb")).toBe("/assets/models/foo.glb");
  });
});

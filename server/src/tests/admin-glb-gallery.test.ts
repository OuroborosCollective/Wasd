import { describe, expect, it } from "vitest";
import {
  sanitizeAdminGlbFilename,
  sanitizeAdminGlbRelativeFolder,
} from "../modules/content/adminGlbGallery.js";

describe("adminGlbGallery sanitize", () => {
  it("allows empty folder", () => {
    expect(sanitizeAdminGlbRelativeFolder("")).toEqual({ ok: true, folder: "" });
    expect(sanitizeAdminGlbRelativeFolder(undefined)).toEqual({ ok: true, folder: "" });
  });

  it("allows safe nested folder", () => {
    expect(sanitizeAdminGlbRelativeFolder("characters/custom")).toEqual({ ok: true, folder: "characters/custom" });
  });

  it("rejects path traversal", () => {
    expect(sanitizeAdminGlbRelativeFolder("a/../b").ok).toBe(false);
  });

  it("rejects bad folder segment", () => {
    expect(sanitizeAdminGlbRelativeFolder("bad folder").ok).toBe(false);
  });

  it("sanitizes filename", () => {
    expect(sanitizeAdminGlbFilename("model.glb")).toEqual({ ok: true, filename: "model.glb" });
    expect(sanitizeAdminGlbFilename("../../evil.glb").ok).toBe(false);
    expect(sanitizeAdminGlbFilename("sub/model.glb").ok).toBe(false);
    expect(sanitizeAdminGlbFilename("noext").ok).toBe(false);
  });
});

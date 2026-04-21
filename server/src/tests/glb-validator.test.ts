import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateGLBFile } from "../assets/GLBAssetValidator.js";
import { AssetValidationCache } from "../assets/AssetValidationCache.js";
import { AssetQuarantineService } from "../assets/AssetQuarantineService.js";

/**
 * Create a minimal valid GLB buffer.
 * Structure: header (12 bytes) + JSON chunk (8 header + JSON data) + optional BIN chunk.
 */
function createValidGLB(jsonContent: string, binData?: Buffer): Buffer {
  const jsonBytes = Buffer.from(jsonContent, "utf-8");
  // Pad JSON to 4-byte alignment
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);

  const binChunkHeader = binData ? 8 : 0;
  const binChunkData = binData ?? Buffer.alloc(0);

  const totalLength = 12 + (8 + jsonChunk.length) + binChunkHeader + binChunkData.length;

  const buf = Buffer.alloc(totalLength);
  let offset = 0;

  // GLB Header
  buf.writeUInt32LE(0x46546C67, offset); offset += 4; // magic "glTF"
  buf.writeUInt32LE(2, offset); offset += 4; // version
  buf.writeUInt32LE(totalLength, offset); offset += 4; // total length

  // JSON chunk header
  buf.writeUInt32LE(jsonChunk.length, offset); offset += 4;
  buf.writeUInt32LE(0x4E4F534A, offset); offset += 4; // "JSON"
  jsonChunk.copy(buf, offset); offset += jsonChunk.length;

  // BIN chunk (optional)
  if (binData) {
    buf.writeUInt32LE(binChunkData.length, offset); offset += 4;
    buf.writeUInt32LE(0x004E4942, offset); offset += 4; // "BIN\0"
    binChunkData.copy(buf, offset);
  }

  return buf;
}

describe("GLB Asset Validator", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "glb-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── GLB File Validator ─────────────────────────────────────────────────

  describe("validateGLBFile", () => {
    it("validates a minimal valid GLB", () => {
      const filePath = path.join(tmpDir, "valid.glb");
      const glb = createValidGLB(JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [] }],
        nodes: [],
        meshes: [],
      }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.severity).toBe("ok");
      expect(result.issues.length).toBe(0);
    });

    it("detects empty file", () => {
      const filePath = path.join(tmpDir, "empty.glb");
      fs.writeFileSync(filePath, Buffer.alloc(0));

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues[0].code).toBe("empty_file");
    });

    it("detects file too small for header", () => {
      const filePath = path.join(tmpDir, "tiny.glb");
      fs.writeFileSync(filePath, Buffer.alloc(4));

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues[0].code).toBe("file_too_small");
    });

    it("detects invalid magic", () => {
      const filePath = path.join(tmpDir, "badmagic.glb");
      const buf = Buffer.alloc(20);
      buf.writeUInt32LE(0x12345678, 0); // wrong magic
      fs.writeFileSync(filePath, buf);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues[0].code).toBe("invalid_magic");
    });

    it("detects length mismatch", () => {
      const filePath = path.join(tmpDir, "badlength.glb");
      const glb = createValidGLB(JSON.stringify({ asset: { version: "2.0" } }));
      // Corrupt the length field
      glb.writeUInt32LE(999, 8);
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues[0].code).toBe("length_mismatch");
    });

    it("detects invalid JSON chunk", () => {
      const filePath = path.join(tmpDir, "badjson.glb");
      // Create GLB with invalid JSON
      const jsonBytes = Buffer.from("{not valid json!!!", "utf-8");
      const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
      const totalLength = 12 + 8 + jsonChunk.length;
      const buf = Buffer.alloc(totalLength);
      buf.writeUInt32LE(0x46546C67, 0);
      buf.writeUInt32LE(2, 4);
      buf.writeUInt32LE(totalLength, 8);
      buf.writeUInt32LE(jsonChunk.length, 12);
      buf.writeUInt32LE(0x4E4F534A, 16);
      jsonChunk.copy(buf, 24);
      fs.writeFileSync(filePath, buf);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues.some(i => i.code === "invalid_json")).toBe(true);
    });

    it("detects truncated file", () => {
      const filePath = path.join(tmpDir, "truncated.glb");
      const glb = createValidGLB(JSON.stringify({ asset: { version: "2.0" } }));
      fs.writeFileSync(filePath, glb.subarray(0, glb.length - 10)); // Truncate

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
    });

    it("detects invalid bufferView references", () => {
      const filePath = path.join(tmpDir, "badref.glb");
      const glb = createValidGLB(JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{
          primitives: [{
            attributes: { POSITION: 999 }, // accessor out of range
          }],
        }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
        buffers: [{ byteLength: 36 }],
      }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues.some(i => i.code === "invalid_primitive_attribute")).toBe(true);
    });

    it("warns on unknown chunk types", () => {
      const filePath = path.join(tmpDir, "unknownchunk.glb");
      const jsonBytes = Buffer.from(JSON.stringify({ asset: { version: "2.0" } }), "utf-8");
      const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
      const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);

      // Add an unknown chunk type
      const unknownChunkData = Buffer.alloc(4, 0xFF);
      const totalLength = 12 + (8 + jsonChunk.length) + (8 + unknownChunkData.length);

      const buf = Buffer.alloc(totalLength);
      let offset = 0;
      buf.writeUInt32LE(0x46546C67, offset); offset += 4;
      buf.writeUInt32LE(2, offset); offset += 4;
      buf.writeUInt32LE(totalLength, offset); offset += 4;
      buf.writeUInt32LE(jsonChunk.length, offset); offset += 4;
      buf.writeUInt32LE(0x4E4F534A, offset); offset += 4;
      jsonChunk.copy(buf, offset); offset += jsonChunk.length;
      buf.writeUInt32LE(unknownChunkData.length, offset); offset += 4;
      buf.writeUInt32LE(0xDEADBEEF, offset); offset += 4; // unknown type
      unknownChunkData.copy(buf, offset);

      fs.writeFileSync(filePath, buf);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(true); // Warning only, not hard failure
      expect(result.severity).toBe("warning");
      expect(result.issues.some(i => i.code === "unknown_chunk_type")).toBe(true);
    });

    it("handles missing file", () => {
      const result = validateGLBFile(path.join(tmpDir, "nonexistent.glb"));
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("hardFailure");
      expect(result.issues[0].code).toBe("file_not_found");
    });

    it("validates node reference integrity", () => {
      const filePath = path.join(tmpDir, "badnode.glb");
      const glb = createValidGLB(JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 5 }], // mesh 5 doesn't exist
        meshes: [{ primitives: [{ attributes: {} }] }],
        accessors: [],
        bufferViews: [],
        buffers: [],
      }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === "invalid_node_mesh")).toBe(true);
    });

    it("validates animation reference integrity", () => {
      const filePath = path.join(tmpDir, "badanim.glb");
      const glb = createValidGLB(JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [] }],
        animations: [{
          channels: [{ sampler: 99, target: { node: 0, path: "translation" } }],
          samplers: [{ input: 0, output: 1 }],
        }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "SCALAR" }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
        buffers: [{ byteLength: 12 }],
      }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === "invalid_animation_sampler")).toBe(true);
    });
  });

  // ─── Asset Validation Cache ─────────────────────────────────────────────

  describe("AssetValidationCache", () => {
    it("caches and retrieves validation results", () => {
      const cachePath = path.join(tmpDir, "cache.json");
      const cache = new AssetValidationCache(cachePath);

      const filePath = path.join(tmpDir, "cached.glb");
      const glb = createValidGLB(JSON.stringify({ asset: { version: "2.0" } }));
      fs.writeFileSync(filePath, glb);

      // No cache initially
      expect(cache.getCached(filePath)).toBeNull();

      // Cache a result
      const result = validateGLBFile(filePath);
      cache.set(filePath, result);

      // Should return cached
      const cached = cache.getCached(filePath);
      expect(cached).not.toBeNull();
      expect(cached!.valid).toBe(true);
    });

    it("invalidates cache when file changes", () => {
      const cachePath = path.join(tmpDir, "cache2.json");
      const cache = new AssetValidationCache(cachePath);

      const filePath = path.join(tmpDir, "changing.glb");
      const glb = createValidGLB(JSON.stringify({ asset: { version: "2.0" } }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      cache.set(filePath, result);

      // Modify the file
      const newGlb = createValidGLB(JSON.stringify({ asset: { version: "2.0", extras: "changed" } }));
      fs.writeFileSync(filePath, newGlb);

      // Cache should be invalidated
      expect(cache.getCached(filePath)).toBeNull();
    });
  });

  // ─── Quarantine Service ─────────────────────────────────────────────────

  describe("QuarantineService", () => {
    it("quarantines files with hard failures", () => {
      const quarantineDir = path.join(tmpDir, "quarantine");
      const service = new AssetQuarantineService(quarantineDir);

      const filePath = path.join(tmpDir, "corrupt.glb");
      fs.writeFileSync(filePath, Buffer.alloc(4)); // Too small

      const result = validateGLBFile(filePath);
      const entry = service.quarantine(result);

      expect(entry).not.toBeNull();
      expect(entry!.reason).toContain("file_too_small");
      expect(fs.existsSync(filePath)).toBe(false); // Original moved
      expect(fs.existsSync(entry!.quarantinePath)).toBe(true);
    });

    it("does not quarantine on warnings", () => {
      const quarantineDir = path.join(tmpDir, "quarantine2");
      const service = new AssetQuarantineService(quarantineDir);

      // Create a GLB with unknown chunk (warning only)
      const filePath = path.join(tmpDir, "warning.glb");
      const glb = createValidGLB(JSON.stringify({ asset: { version: "2.0" } }));
      fs.writeFileSync(filePath, glb);

      const result = validateGLBFile(filePath);
      expect(result.severity).not.toBe("hardFailure");

      const entry = service.quarantine(result);
      expect(entry).toBeNull(); // Should not quarantine warnings
    });

    it("restores quarantined files", () => {
      const quarantineDir = path.join(tmpDir, "quarantine3");
      const service = new AssetQuarantineService(quarantineDir);

      const filePath = path.join(tmpDir, "restore.glb");
      fs.writeFileSync(filePath, Buffer.alloc(4));

      const result = validateGLBFile(filePath);
      service.quarantine(result);

      expect(fs.existsSync(filePath)).toBe(false);

      const restored = service.restore(filePath);
      expect(restored).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("tracks quarantine manifest", () => {
      const quarantineDir = path.join(tmpDir, "quarantine4");
      const service = new AssetQuarantineService(quarantineDir);

      const filePath = path.join(tmpDir, "tracked.glb");
      fs.writeFileSync(filePath, Buffer.alloc(0));

      const result = validateGLBFile(filePath);
      service.quarantine(result);

      expect(service.count).toBe(1);
      expect(service.isQuarantined(filePath)).toBe(true);

      const entries = service.getEntries();
      expect(entries[0].originalPath).toBe(filePath);
    });
  });
});

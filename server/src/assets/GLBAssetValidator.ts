// @ts-nocheck
/**
 * GLB Asset Validator - Binary integrity checks for .glb files.
 *
 * Implements strict GLB header, chunk, JSON, and reference validation.
 * Distinguishes hard failures (corrupt file) from warnings (unusual but valid).
 * Babylon.js compatible, no Three.js assumptions.
 *
 * Hard failures → quarantine candidates.
 * Warnings → log and keep.
 */

import * as fs from "node:fs";
import type {
  GLBValidationResult,
  GLBValidationIssue,
  GLBValidationSeverity,
} from "../core/liveheal/LiveHealTypes.js";

// GLB constants
const GLB_MAGIC = 0x46546C67; // "glTF" in little-endian
const GLB_HEADER_SIZE = 12;
const GLB_VERSION_SUPPORTED = 2;
const CHUNK_TYPE_JSON = 0x4E4F534A; // "JSON"
const CHUNK_TYPE_BIN = 0x004E4942; // "BIN\0"

function readUint32LE(buf: Buffer, offset: number): number {
  if (offset + 4 > buf.length) return -1;
  return buf.readUInt32LE(offset);
}

function addIssue(
  issues: GLBValidationIssue[],
  severity: GLBValidationSeverity,
  code: string,
  message: string,
  byteOffset?: number
): void {
  issues.push({ severity, code, message, byteOffset });
}

/**
 * Validate a GLB file for binary integrity.
 * Returns a structured result with issues.
 */
export function validateGLBFile(filePath: string): GLBValidationResult {
  const issues: GLBValidationIssue[] = [];
  const now = Date.now();

  // --- A) File readability ---
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return {
      filePath,
      valid: false,
      severity: "hardFailure",
      issues: [{ severity: "hardFailure", code: "file_not_found", message: "File does not exist or is not readable." }],
      fileSize: 0,
      mtimeMs: 0,
      validatedAt: now,
    };
  }

  const fileSize = stat.size;
  const mtimeMs = stat.mtimeMs;

  if (fileSize === 0) {
    return {
      filePath,
      valid: false,
      severity: "hardFailure",
      issues: [{ severity: "hardFailure", code: "empty_file", message: "File is empty (0 bytes).", byteOffset: 0 }],
      fileSize,
      mtimeMs,
      validatedAt: now,
    };
  }

  if (fileSize < GLB_HEADER_SIZE) {
    addIssue(issues, "hardFailure", "file_too_small",
      `File too small (${fileSize} bytes) for GLB header (${GLB_HEADER_SIZE} bytes min).`, 0);
    return { filePath, valid: false, severity: "hardFailure", issues, fileSize, mtimeMs, validatedAt: now };
  }

  // Read the file
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch {
    return {
      filePath,
      valid: false,
      severity: "hardFailure",
      issues: [{ severity: "hardFailure", code: "read_error", message: "Failed to read file contents." }],
      fileSize,
      mtimeMs,
      validatedAt: now,
    };
  }

  // --- B) GLB Header ---
  const magic = readUint32LE(buf, 0);
  if (magic !== GLB_MAGIC) {
    addIssue(issues, "hardFailure", "invalid_magic",
      `Invalid GLB magic: expected 0x${GLB_MAGIC.toString(16)}, got 0x${magic.toString(16)}.`, 0);
    return { filePath, valid: false, severity: "hardFailure", issues, fileSize, mtimeMs, validatedAt: now };
  }

  const version = readUint32LE(buf, 4);
  if (version !== GLB_VERSION_SUPPORTED) {
    addIssue(issues, "hardFailure", "unsupported_version",
      `Unsupported GLB version: ${version} (expected ${GLB_VERSION_SUPPORTED}).`, 4);
  }

  const totalLength = readUint32LE(buf, 8);
  if (totalLength !== fileSize) {
    addIssue(issues, "hardFailure", "length_mismatch",
      `GLB header length (${totalLength}) does not match file size (${fileSize}).`, 8);
    return { filePath, valid: false, severity: "hardFailure", issues, fileSize, mtimeMs, validatedAt: now };
  }

  // --- C) Chunk Structure ---
  let offset = GLB_HEADER_SIZE;
  let jsonChunkFound = false;
  let binChunkFound = false;
  let chunkIndex = 0;

  while (offset < fileSize) {
    if (offset + 8 > fileSize) {
      addIssue(issues, "hardFailure", "truncated_chunk_header",
        `Truncated chunk header at offset ${offset}.`, offset);
      break;
    }

    const chunkLength = readUint32LE(buf, offset);
    const chunkType = readUint32LE(buf, offset + 4);

    if (chunkLength < 0) {
      addIssue(issues, "hardFailure", "invalid_chunk_length",
        `Invalid chunk length at offset ${offset}.`, offset);
      break;
    }

    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkLength;

    if (chunkDataEnd > fileSize) {
      addIssue(issues, "hardFailure", "chunk_out_of_bounds",
        `Chunk ${chunkIndex} data extends beyond file (offset=${offset}, length=${chunkLength}, file=${fileSize}).`, offset);
      break;
    }

    if (chunkType === CHUNK_TYPE_JSON) {
      if (chunkIndex !== 0) {
        addIssue(issues, "hardFailure", "json_not_first_chunk",
          `JSON chunk is not the first chunk (index=${chunkIndex}).`, offset);
      }
      jsonChunkFound = true;

      // --- D) JSON Validity ---
      try {
        const jsonStr = buf.subarray(chunkDataStart, chunkDataEnd).toString("utf-8");
        const parsed = JSON.parse(jsonStr);

        // --- E) Reference Integrity ---
        validateGLTFReferences(parsed, issues, chunkDataStart);
      } catch (parseError) {
        addIssue(issues, "hardFailure", "invalid_json",
          `JSON chunk is not valid JSON: ${(parseError as Error).message}.`, offset);
      }
    } else if (chunkType === CHUNK_TYPE_BIN) {
      binChunkFound = true;
    } else {
      // Unknown chunk type - warning only
      addIssue(issues, "warning", "unknown_chunk_type",
        `Unknown chunk type 0x${chunkType.toString(16)} at index ${chunkIndex}.`, offset);
    }

    chunkIndex += 1;
    offset = chunkDataEnd;
  }

  if (!jsonChunkFound) {
    addIssue(issues, "hardFailure", "no_json_chunk", "No JSON chunk found in GLB file.");
  }

  // Determine overall severity
  const hasHardFailure = issues.some((i) => i.severity === "hardFailure");
  const severity: GLBValidationSeverity = hasHardFailure ? "hardFailure" : issues.length > 0 ? "warning" : "ok";

  return {
    filePath,
    valid: !hasHardFailure,
    severity,
    issues,
    fileSize,
    mtimeMs,
    validatedAt: now,
  };
}

/**
 * Validate glTF JSON references for out-of-bounds indices.
 */
function validateGLTFReferences(
  gltf: Record<string, unknown>,
  issues: GLBValidationIssue[],
  baseOffset: number
): void {
  // Top-level structure check
  if (typeof gltf !== "object" || gltf === null) {
    addIssue(issues, "hardFailure", "invalid_gltf_root",
      "glTF root is not an object.", baseOffset);
    return;
  }

  if (!gltf.asset || typeof gltf.asset !== "object") {
    addIssue(issues, "warning", "missing_asset_field",
      "Missing or invalid 'asset' field in glTF.", baseOffset);
  }

  // Validate bufferViews
  const bufferViews = Array.isArray(gltf.bufferViews) ? gltf.bufferViews : [];
  const buffers = Array.isArray(gltf.buffers) ? gltf.buffers : [];

  for (let i = 0; i < bufferViews.length; i++) {
    const bv = bufferViews[i] as Record<string, unknown>;
    if (typeof bv.buffer === "number" && (bv.buffer < 0 || bv.buffer >= buffers.length)) {
      addIssue(issues, "hardFailure", "invalid_buffer_reference",
        `bufferView[${i}].buffer references non-existent buffer ${bv.buffer}.`, baseOffset);
    }
    if (typeof bv.byteOffset === "number" && bv.byteOffset < 0) {
      addIssue(issues, "hardFailure", "negative_byte_offset",
        `bufferView[${i}].byteOffset is negative.`, baseOffset);
    }
    if (typeof bv.byteLength === "number" && bv.byteLength < 0) {
      addIssue(issues, "hardFailure", "negative_byte_length",
        `bufferView[${i}].byteLength is negative.`, baseOffset);
    }
  }

  // Validate accessors
  const accessors = Array.isArray(gltf.accessors) ? gltf.accessors : [];
  for (let i = 0; i < accessors.length; i++) {
    const acc = accessors[i] as Record<string, unknown>;
    if (typeof acc.bufferView === "number") {
      if (acc.bufferView < 0 || acc.bufferView >= bufferViews.length) {
        addIssue(issues, "hardFailure", "invalid_accessor_bufferView",
          `accessor[${i}].bufferView references non-existent bufferView ${acc.bufferView}.`, baseOffset);
      }
    }
  }

  // Validate nodes
  const nodes = Array.isArray(gltf.nodes) ? gltf.nodes : [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;
    if (typeof node.mesh === "number") {
      const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
      if (node.mesh < 0 || node.mesh >= meshes.length) {
        addIssue(issues, "hardFailure", "invalid_node_mesh",
          `nodes[${i}].mesh references non-existent mesh ${node.mesh}.`, baseOffset);
      }
    }
    if (typeof node.skin === "number") {
      const skins = Array.isArray(gltf.skins) ? gltf.skins : [];
      if (node.skin < 0 || node.skin >= skins.length) {
        addIssue(issues, "hardFailure", "invalid_node_skin",
          `nodes[${i}].skin references non-existent skin ${node.skin}.`, baseOffset);
      }
    }
  }

  // Validate meshes
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i] as Record<string, unknown>;
    const primitives = Array.isArray(mesh.primitives) ? mesh.primitives : [];
    for (let j = 0; j < primitives.length; j++) {
      const prim = primitives[j] as Record<string, unknown>;
      if (typeof prim.indices === "number" && (prim.indices < 0 || prim.indices >= accessors.length)) {
        addIssue(issues, "hardFailure", "invalid_primitive_indices",
          `meshes[${i}].primitives[${j}].indices references non-existent accessor.`, baseOffset);
      }
      const attrs = prim.attributes as Record<string, unknown> | undefined;
      if (attrs) {
        for (const [key, val] of Object.entries(attrs)) {
          if (typeof val === "number" && (val < 0 || val >= accessors.length)) {
            addIssue(issues, "hardFailure", "invalid_primitive_attribute",
              `meshes[${i}].primitives[${j}].attributes.${key} references non-existent accessor.`, baseOffset);
          }
        }
      }
    }
  }

  // Validate animations
  const animations = Array.isArray(gltf.animations) ? gltf.animations : [];
  for (let i = 0; i < animations.length; i++) {
    const anim = animations[i] as Record<string, unknown>;
    const channels = Array.isArray(anim.channels) ? anim.channels : [];
    const samplersCount = Array.isArray(anim.samplers) ? anim.samplers.length : 0;
    for (let j = 0; j < channels.length; j++) {
      const ch = channels[j] as Record<string, unknown>;
      if (typeof ch.sampler === "number" && (ch.sampler < 0 || ch.sampler >= samplersCount)) {
        addIssue(issues, "hardFailure", "invalid_animation_sampler",
          `animations[${i}].channels[${j}].sampler references non-existent sampler.`, baseOffset);
      }
    }
  }

  // Validate scene reference
  if (typeof gltf.scene === "number") {
    const scenes = Array.isArray(gltf.scenes) ? gltf.scenes : [];
    if (gltf.scene < 0 || gltf.scene >= scenes.length) {
      addIssue(issues, "hardFailure", "invalid_default_scene",
        `Default scene index ${gltf.scene} out of range (${scenes.length} scenes).`, baseOffset);
    }
  }

  // Validate materials
  const materials = Array.isArray(gltf.materials) ? gltf.materials : [];
  const textures = Array.isArray(gltf.textures) ? gltf.textures : [];
  const images = Array.isArray(gltf.images) ? gltf.images : [];
  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i] as Record<string, unknown>;
    const pbr = mat.pbrMetallicRoughness as Record<string, unknown> | undefined;
    if (pbr) {
      const baseTex = pbr.baseColorTexture as Record<string, unknown> | undefined;
      if (baseTex && typeof baseTex.index === "number" && (baseTex.index < 0 || baseTex.index >= textures.length)) {
        addIssue(issues, "hardFailure", "invalid_material_texture",
          `materials[${i}].pbrMetallicRoughness.baseColorTexture.index out of range.`, baseOffset);
      }
    }
  }
}

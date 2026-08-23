#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const REQUIRED_SCENARIOS = Object.freeze([
  "first-actionable-screen",
  "movement",
  "interaction",
  "quest-inventory",
  "desktop",
  "mobile",
  "resize",
]);

const SHA40 = /^[0-9a-f]{40}$/i;
const HASH64 = /^[0-9a-f]{64}$/i;
const ZERO64 = /^0{64}$/i;

function fail(message) {
  throw new Error(`[2d3d-playtest-gate] ${message}`);
}

function readJson(filePath) {
  if (!existsSync(filePath)) fail(`missing evidence manifest: ${filePath}`);
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`invalid evidence manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requireNonZeroWorldHash(value, label) {
  if (typeof value !== "string" || !HASH64.test(value) || ZERO64.test(value)) {
    fail(`${label} must be a non-zero 64-hex world hash`);
  }
  return value.toLowerCase();
}

function requireRevision(value, expectedRevision) {
  if (typeof value !== "string" || !SHA40.test(value)) fail("revision must be a full 40-hex commit SHA");
  const normalized = value.toLowerCase();
  if (expectedRevision && normalized !== expectedRevision.toLowerCase()) {
    fail(`revision mismatch: evidence=${normalized} expected=${expectedRevision.toLowerCase()}`);
  }
  return normalized;
}

function requireProjection(projection, name) {
  if (!projection || typeof projection !== "object") fail(`${name} projection evidence is missing`);
  const worldHash = requireNonZeroWorldHash(projection.worldHash, `${name}.worldHash`);
  const tick = Number(projection.tick);
  const rateHz = Number(projection.rateHz);
  const durationMs = Number(projection.durationMs);
  if (!Number.isSafeInteger(tick) || tick < 0) fail(`${name}.tick must be a non-negative safe integer`);
  if (rateHz !== 10 || durationMs !== 100) fail(`${name} must prove the canonical 10 Hz / 100 ms tick contract`);
  return { worldHash, tick, rateHz, durationMs };
}

function requireScreenshot(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.toLowerCase().endsWith(".png")) {
    fail(`${label} must reference a PNG screenshot`);
  }
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`${label} escapes evidence directory`);
  if (!existsSync(resolved)) fail(`${label} screenshot is missing: ${relativePath}`);
  if (statSync(resolved).size <= 0) fail(`${label} screenshot is empty: ${relativePath}`);
}

function requireScenarioEvidence(root, scenarios, projectionName) {
  if (!scenarios || typeof scenarios !== "object") fail(`${projectionName}.scenarios is missing`);
  for (const scenario of REQUIRED_SCENARIOS) {
    const entry = scenarios[scenario];
    if (!entry || typeof entry !== "object") fail(`${projectionName} is missing scenario '${scenario}'`);
    requireScreenshot(root, entry.screenshot, `${projectionName}.${scenario}`);
    if (typeof entry.observed !== "string" || entry.observed.trim().length < 3) {
      fail(`${projectionName}.${scenario}.observed must describe the real observed state`);
    }
  }
}

function verifyEvidence(manifestPath, expectedRevision) {
  const root = path.dirname(manifestPath);
  const evidence = readJson(manifestPath);
  const revision = requireRevision(evidence.revision, expectedRevision);
  const world2d = requireProjection(evidence.projections?.client2d, "client2d");
  const world3d = requireProjection(evidence.projections?.client3d, "client3d");

  if (world2d.worldHash !== world3d.worldHash) {
    fail(`world truth divergence: 2D=${world2d.worldHash} 3D=${world3d.worldHash}`);
  }
  if (world2d.tick !== world3d.tick) {
    fail(`tick divergence: 2D=${world2d.tick} 3D=${world3d.tick}`);
  }

  requireScenarioEvidence(root, evidence.projections.client2d.scenarios, "client2d");
  requireScenarioEvidence(root, evidence.projections.client3d.scenarios, "client3d");

  if (evidence.domHudReviewedSeparately !== true) fail("DOM HUD review evidence is required");
  if (evidence.rendererLayersReviewedSeparately !== true) fail("Pixi/Babylon renderer-layer review evidence is required");

  return Object.freeze({
    ok: true,
    revision,
    tick: world2d.tick,
    worldHash: world2d.worldHash,
    rateHz: 10,
    durationMs: 100,
    scenariosPerProjection: REQUIRED_SCENARIOS.length,
  });
}

const manifestPath = path.resolve(
  process.env.PLAYTEST_EVIDENCE_MANIFEST || process.argv[2] || "artifacts/runtime-playtest/2d3d-evidence.json",
);
const expectedRevision = process.env.EXPECTED_COMMIT_SHA || process.env.GITHUB_SHA || "";

try {
  const result = verifyEvidence(manifestPath, expectedRevision);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

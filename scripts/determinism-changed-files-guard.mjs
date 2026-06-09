#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const baseRef = process.env.GITHUB_BASE_REF || process.env.BASE_REF || "main";
const allowedSourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const criticalPathPatterns = [
  /^server\/src\/(gameplay|equipment|loot|combat|gathering|economy|crafting|npc|world|core)\//,
  /^apps\/client-2d\/src\/(game|simulation|world|engine)\//,
  /^packages\/.*\/src\//,
];

const ignoredPathPatterns = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)coverage\//,
  /(^|\/)\.turbo\//,
  /(^|\/)\.next\//,
  /(^|\/)\.cache\//,
  /(^|\/)scripts\//,
  /(^|\/)test(s)?\//,
  /\.test\.[cm]?[jt]sx?$/,
  /\.spec\.[cm]?[jt]sx?$/,
];

const forbiddenPatterns = [
  { label: "Math.random()", regex: /\bMath\.random\s*\(/, hint: "Use seeded ARE RNG from explicit seed/tick input." },
  { label: "Date.now()", regex: /\bDate\.now\s*\(/, hint: "Use AREClock.msFromTick(authoritativeTick) or WorldTickTimeAdapter.nowTick()." },
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getChangedFiles() {
  try {
    git(["fetch", "origin", baseRef, "--depth=1"]);
  } catch {
    // Checkout may already have the base ref. Continue with best effort.
  }

  const candidates = [
    [`origin/${baseRef}...HEAD`],
    [`${baseRef}...HEAD`],
    ["HEAD~1...HEAD"],
  ];

  for (const [range] of candidates) {
    try {
      const out = git(["diff", "--name-only", range]);
      if (out.length > 0) return out.split(/\r?\n/).filter(Boolean);
    } catch {
      // Try the next range.
    }
  }

  return [];
}

function isAllowedFile(filePath) {
  const ext = path.extname(filePath);
  if (!allowedSourceExtensions.has(ext)) return false;
  if (ignoredPathPatterns.some((pattern) => pattern.test(filePath))) return false;
  return criticalPathPatterns.some((pattern) => pattern.test(filePath));
}

function hasAllowComment(lines, lineIndex) {
  const start = Math.max(0, lineIndex - 2);
  const end = Math.min(lines.length - 1, lineIndex + 1);
  for (let i = start; i <= end; i += 1) {
    if (lines[i]?.includes("ARE-DETERMINISM-ALLOW")) return true;
  }
  return false;
}

const violations = [];

for (const filePath of getChangedFiles()) {
  if (!isAllowedFile(filePath)) continue;
  if (!existsSync(filePath)) continue;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of forbiddenPatterns) {
      if (!pattern.regex.test(line)) continue;
      if (hasAllowComment(lines, index)) continue;
      violations.push({
        filePath,
        line: index + 1,
        label: pattern.label,
        hint: pattern.hint,
        text: line.trim(),
      });
    }
  });
}

if (violations.length > 0) {
  console.error("Determinism guard failed: forbidden gameplay time/random source detected.");
  for (const violation of violations) {
    console.error(`- ${violation.filePath}:${violation.line} uses ${violation.label}: ${violation.text}`);
    console.error(`  fix: ${violation.hint}`);
  }
  process.exit(1);
}

console.log("Determinism guard passed: no forbidden Math.random()/Date.now() usage in changed critical gameplay files.");

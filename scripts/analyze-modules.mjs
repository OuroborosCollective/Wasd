#!/usr/bin/env node
/**
 * Module Analysis Scanner
 *
 * Scans server/src/modules and categorizes files for ARE-readiness.
 * Text output is intended for humans. `--json` emits a machine-readable report
 * for CI, release gates, and agents.
 *
 * Usage:
 *   node scripts/analyze-modules.mjs [--verbose] [--category=<A-E>] [--module=<name>]
 *   node scripts/analyze-modules.mjs --json
 *   node scripts/analyze-modules.mjs --json=reports/module-analysis.json
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { dirname, extname, join, relative } from "path";
import { argv, cwd, exit } from "process";

const MODULES_DIR = "server/src/modules";

const CATEGORY_LABELS = {
  A: "ARE-Aligned",
  B: "Deterministic-Ready",
  C: "Utility/Low-Risk",
  D: "Non-Deterministic",
  E: "Stub/Fake",
};

const PATTERNS = {
  TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
  TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
  KAPPA_TYPES: /Kappa|TickId|StateHash|ChunkKey/,
  DETERMINISTIC_PRNG: /DeterministicPrng|createDeterministicPrng|SeededARERng/,
  DELTA_PATTERN: /\bDelta\b|StateDelta|generateDelta/,
  MATH_RANDOM: /Math\.random\(/,
  DATE_NOW_ACTUAL: /Date\.now\(\)/,
  DATE_NEW_WITH_ALLOW: /new\s+Date\([^)]*\)\s*\/\*\s*ARE-DETERMINISM-ALLOW/,
  DATE_NEW_BARE: /new\s+Date\(\)/,
  PERFORMANCE_NOW: /performance\.now\(\)/,
  SET_TIMEOUT: /setTimeout|setInterval/,
  WORLD_TICK_IMPORT: /WorldTick[^a-zA-Z]|from\s+['"]\.\.\/WorldTick|WorldTickProvider/,
  STUB_RETURN_NULL: /return\s+null|return\s+undefined/,
  STUB_EMPTY_ARRAY: /return\s*\[\s*\]/,
  STUB_NOT_IMPLEMENTED: /throw\s+new\s+Error\(['"]Not\s+implemented|NOT\s+IMPLEMENTED/i,
  STUB_COMMENT: /\/\/\s*(TODO|FIXME|HACK|stub|placeholder)/i,
  ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
  ARE_TELEMETRY_SIDECHANNEL: /@are-telemetry-side-channel/,
};

const args = argv.slice(2);
const jsonArg = args.find((a) => a === "--json" || a.startsWith("--json="));
const options = {
  verbose: args.includes("--verbose"),
  ci: args.includes("--ci"),
  json: Boolean(jsonArg),
  jsonPath: jsonArg?.includes("=") ? jsonArg.split("=").slice(1).join("=") : null,
  category: args.find((a) => a.startsWith("--category="))?.split("=")[1],
  module: args.find((a) => a.startsWith("--module="))?.split("=")[1],
  failOn: args.find((a) => a.startsWith("--fail-on="))?.split("=")[1]?.split(",").filter(Boolean) ?? [],
};

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return {
    content,
    lines: content.split("\n").length,
    imports,
  };
}

function addIssue(issues, code, reason, severity = "warning") {
  issues.push({ code, reason, severity });
}

function categorizeModule({ content, lines }) {
  const patterns = [];
  const issues = [];

  const isAREAligned = PATTERNS.TICK_SYSTEM.test(content)
    || PATTERNS.TICK_SYSTEM_PRIORITY.test(content)
    || PATTERNS.KAPPA_TYPES.test(content);
  const hasDeterministicPrng = PATTERNS.DETERMINISTIC_PRNG.test(content);
  const hasDelta = PATTERNS.DELTA_PATTERN.test(content);
  const hasMathRandom = PATTERNS.MATH_RANDOM.test(content);
  const hasDateNow = PATTERNS.DATE_NOW_ACTUAL.test(content);
  const hasDateNewBare = PATTERNS.DATE_NEW_BARE.test(content) && !PATTERNS.DATE_NEW_WITH_ALLOW.test(content);
  const hasPerformanceNow = PATTERNS.PERFORMANCE_NOW.test(content);
  const hasSetTimeout = PATTERNS.SET_TIMEOUT.test(content);
  const hasWorldTickImport = PATTERNS.WORLD_TICK_IMPORT.test(content);
  const hasAREAllow = PATTERNS.ARE_DETERMINISM_ALLOW.test(content);
  const hasTelemetrySideChannel = PATTERNS.ARE_TELEMETRY_SIDECHANNEL.test(content);
  const isStub = PATTERNS.STUB_NOT_IMPLEMENTED.test(content)
    || (PATTERNS.STUB_RETURN_NULL.test(content) && lines < 30)
    || (PATTERNS.STUB_EMPTY_ARRAY.test(content) && lines < 30);
  const hasStubComments = PATTERNS.STUB_COMMENT.test(content);

  if (isAREAligned) patterns.push("TICK_SYSTEM");
  if (hasDeterministicPrng) patterns.push("DETERMINISTIC_PRNG");
  if (hasDelta) patterns.push("DELTA");
  if (hasMathRandom) patterns.push("MATH_RANDOM");
  if (hasDateNow) patterns.push("DATE_NOW");
  if (hasDateNewBare) patterns.push("DATE_NEW");
  if (hasPerformanceNow) patterns.push("PERFORMANCE_NOW");
  if (hasSetTimeout) patterns.push("SET_TIMEOUT");
  if (isStub) patterns.push("STUB");

  if (hasMathRandom && !hasAREAllow) {
    addIssue(issues, "MATH_RANDOM", "Uses Math.random in module code; use deterministic tick/seed RNG.", "error");
  }
  if (hasDateNow) {
    addIssue(issues, "DATE_NOW", "Uses Date.now; truth-path code must use tick/runtime sources.", "error");
  }
  if (hasDateNewBare && !hasTelemetrySideChannel) {
    addIssue(issues, "DATE_NEW", "Uses bare new Date(); mark side-channel usage or replace with tick time.", "error");
  }
  if (hasPerformanceNow && !hasAREAllow && !hasTelemetrySideChannel) {
    addIssue(issues, "PERFORMANCE_NOW", "Uses performance.now without ARE side-channel allowance.", "error");
  }
  if (hasWorldTickImport && !isAREAligned && !content.includes("installARE") && !content.includes("installRuntime")) {
    addIssue(issues, "WORLD_TICK_IMPORT", "Direct WorldTick usage outside ARE-aligned integration; prefer TickSystemContext.", "warning");
  }
  if (hasStubComments) {
    addIssue(issues, "STUB_COMMENT", "Contains TODO/FIXME/HACK/stub/placeholder marker; verify it is not in truth path.", "warning");
  }
  if (isStub && !isAREAligned) {
    addIssue(issues, "STUB", "Small stub/fake module candidate; delete or wire to a real runtime source.", "error");
  }

  let category = "B";
  if (isStub && !isAREAligned) category = "E";
  else if (issues.some((issue) => issue.severity === "error" && ["MATH_RANDOM", "DATE_NOW", "DATE_NEW", "PERFORMANCE_NOW", "STUB"].includes(issue.code))) category = "D";
  else if (isAREAligned && hasDeterministicPrng) category = "A";
  else if (isAREAligned || hasDelta) category = "B";
  else if (patterns.length === 0 || hasStubComments) category = "C";

  return { category, patterns, issues };
}

function listTypeScriptFiles(modulePath) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === "dist" || entry === "node_modules" || entry.startsWith(".")) continue;
        visit(fullPath);
      } else if (stat.isFile() && extname(entry) === ".ts" && !entry.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  };
  visit(modulePath);
  return files.sort((a, b) => a.localeCompare(b));
}

function analyzeModules() {
  if (!existsSync(MODULES_DIR)) {
    return [];
  }

  const moduleDirs = readdirSync(MODULES_DIR)
    .filter((name) => statSync(join(MODULES_DIR, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b));
  const results = [];

  for (const moduleDir of moduleDirs) {
    if (options.module && options.module !== moduleDir) continue;
    const modulePath = join(MODULES_DIR, moduleDir);
    for (const filePath of listTypeScriptFiles(modulePath)) {
      const scan = scanFile(filePath);
      const categorized = categorizeModule(scan);
      if (options.category && options.category !== categorized.category) continue;

      results.push({
        path: relative(cwd(), filePath),
        module: moduleDir,
        filename: relative(modulePath, filePath),
        category: categorized.category,
        categoryLabel: CATEGORY_LABELS[categorized.category],
        patterns: categorized.patterns,
        issues: categorized.issues,
        reasons: categorized.issues.map((issue) => issue.reason),
        lines: scan.lines,
        imports: scan.imports.slice(0, 5),
      });
    }
  }

  return results;
}

function createReport(results) {
  const categories = { A: [], B: [], C: [], D: [], E: [] };
  for (const result of results) {
    categories[result.category].push(result);
  }

  const blockedCats = options.failOn.length > 0 ? options.failOn : ["D", "E"];
  const blocked = blockedCats.flatMap((category) => categories[category] ?? []);

  return {
    schemaVersion: 1,
    generatedBy: "scripts/analyze-modules.mjs",
    filters: {
      category: options.category ?? null,
      module: options.module ?? null,
      failOn: blockedCats,
    },
    summary: {
      totalFiles: results.length,
      byCategory: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.length])),
      actionable: categories.B.length + categories.C.length + categories.D.length + categories.E.length,
      immediateDeleteCandidates: categories.E.length,
      criticalFixesNeeded: categories.D.length,
      blockedCount: blocked.length,
      gate: blocked.length > 0 ? "blocked" : "ready",
    },
    categories: Object.fromEntries(
      Object.entries(categories).map(([key, value]) => [
        key,
        {
          label: CATEGORY_LABELS[key],
          count: value.length,
          files: value,
        },
      ])
    ),
    files: results,
  };
}

function printTextReport(report) {
  console.log("\n=== MODULE ANALYSIS REPORT ===\n");
  console.log(`Total files analyzed: ${report.summary.totalFiles}`);
  console.log("\n--- BY CATEGORY ---");

  for (const [category, data] of Object.entries(report.categories)) {
    console.log(`\nCategory ${category} [${data.label}]: ${data.count} file(s)`);
    if (options.verbose || data.files.length <= 20) {
      for (const file of data.files) {
        const issueText = file.issues.length > 0
          ? ` ⚠ ${file.issues.map((issue) => `${issue.code}: ${issue.reason}`).join(" | ")}`
          : "";
        console.log(`  - ${file.path} (${file.lines} lines)${issueText}`);
        if (options.verbose && file.patterns.length > 0) {
          console.log(`    Patterns: ${file.patterns.join(", ")}`);
        }
      }
    } else {
      console.log(`  ${data.files.map((file) => file.filename).join(", ")}`);
    }
  }

  console.log("\n--- SUMMARY ---");
  for (const [category, count] of Object.entries(report.summary.byCategory)) {
    console.log(`${category} ${CATEGORY_LABELS[category]}: ${count}`);
  }
  console.log(`Actionable: ${report.summary.actionable}`);
  console.log(`Immediate delete candidates: ${report.summary.immediateDeleteCandidates}`);
  console.log(`Critical fixes needed: ${report.summary.criticalFixesNeeded}`);
  console.log(`Gate: ${report.summary.gate}`);
}

function emitJson(report) {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.jsonPath) {
    mkdirSync(dirname(options.jsonPath), { recursive: true });
    writeFileSync(options.jsonPath, json, "utf-8");
    return;
  }
  console.log(json);
}

const results = analyzeModules();
const report = createReport(results);

if (options.json) emitJson(report);
else printTextReport(report);

if (options.ci || options.failOn.length > 0) {
  if (report.summary.blockedCount > 0) {
    if (!options.json) {
      console.log(`\n❌ CI GATE FAILED: ${report.summary.blockedCount} file(s) in blocked categories.`);
    }
    exit(1);
  }
  if (!options.json) console.log("\n✅ CI GATE PASSED: No blocked categories found");
}

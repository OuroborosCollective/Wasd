#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Severity = "info" | "warn" | "error";
type CheckName =
  | "lint"
  | "unit"
  | "e2e"
  | "contentValidate"
  | "assetsAudit"
  | "wsSchemaSmoke"
  | "uiA11ySmoke"
  | "clientBuild"
  | "serverBuild";

const ALL_CHECKS: readonly CheckName[] = [
  "lint",
  "unit",
  "e2e",
  "contentValidate",
  "assetsAudit",
  "wsSchemaSmoke",
  "uiA11ySmoke",
  "clientBuild",
  "serverBuild",
] as const;

type DgccReport = {
  startedAt: string;
  finishedAt: string;
  mode: string;
  ok: boolean;
  checks: Array<{ name: CheckName; ok: boolean; durationMs: number; summary?: string }>;
  inconsistencies: Array<{ category: string; severity: Severity; message: string; file?: string; hint?: string }>;
  fixes: Array<{ kind: string; message: string; file?: string }>;
  artifacts: Record<string, string>;
};

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, "tools/dgcc/dgcc.contract.json");

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function run(cmd: string, args: string[], opts?: { env?: Record<string, string> }) {
  return new Promise<{ code: number; stdout: string; stderr: string; durationMs: number }>((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: process.platform === "win32",
      env: { ...process.env, ...(opts?.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr, durationMs: Date.now() - t0 }));
  });
}

function parseMode() {
  const arg = process.argv.find((x) => x.startsWith("--mode="));
  return (arg?.split("=")[1] || process.env.DGCC_MODE || "minimal").trim();
}

function wantFixes(contract: { modes?: Record<string, { fix?: { enabled?: boolean } }> }, mode: string) {
  if (process.env.DGCC_FIX === "1") return true;
  if (process.env.DGCC_FIX === "0") return false;
  const modeFix = contract.modes?.[mode]?.fix?.enabled;
  if (typeof modeFix === "boolean") return modeFix;
  return mode === "extreme";
}

function isCheckName(x: string): x is CheckName {
  return (ALL_CHECKS as readonly string[]).includes(x);
}

function loadContract(): any {
  if (!fs.existsSync(CONTRACT_PATH)) {
    throw new Error(`DGCC contract missing: ${path.relative(ROOT, CONTRACT_PATH)}`);
  }
  const contract = readJson<any>(CONTRACT_PATH);
  if (!contract?.modes?.minimal) {
    throw new Error("DGCC contract invalid: missing modes.minimal");
  }
  return contract;
}

function validateReportShape(report: DgccReport): void {
  const requiredTop = ["startedAt", "finishedAt", "mode", "ok", "checks", "inconsistencies", "fixes", "artifacts"] as const;
  for (const k of requiredTop) {
    if (!(k in report)) throw new Error(`DGCC report missing field: ${k}`);
  }
  for (const c of report.checks) {
    if (!c.name || typeof c.ok !== "boolean" || typeof c.durationMs !== "number") {
      throw new Error("DGCC report checks[] entry invalid");
    }
  }
  for (const i of report.inconsistencies) {
    if (!i.category || !i.severity || !i.message) throw new Error("DGCC report inconsistencies[] entry invalid");
  }
  for (const f of report.fixes) {
    if (!f.kind || !f.message) throw new Error("DGCC report fixes[] entry invalid");
  }
}

function printHeader(mode: string, fix: boolean) {
  console.log(`[DGCC] mode=${mode} fix=${fix ? "on" : "off"}`);
}

async function assetsAudit(report: DgccReport, contract: any, fix: boolean) {
  const clientDir = path.join(ROOT, contract.rules.assets.clientModelsDir);
  if (!fs.existsSync(clientDir)) {
    report.inconsistencies.push({
      category: "assets",
      severity: "warn",
      message: `Client models dir missing: ${contract.rules.assets.clientModelsDir}`,
      hint: "If this is expected in CI, ensure assets are present in build artifact or disable this check.",
    });
    return;
  }
  const mustHave = ["characters", "monsters", "npcs", "objects", "items", "resources"].map((x) =>
    path.join(clientDir, x)
  );
  for (const p of mustHave) {
    if (!fs.existsSync(p)) {
      report.inconsistencies.push({
        category: "assets",
        severity: "warn",
        message: `Missing models subfolder: ${path.relative(ROOT, p)}`,
        hint: "Not fatal, but content linking will be noisier. Create folder or adjust DGCC contract.",
      });
      if (fix) {
        ensureDir(p);
        report.fixes.push({
          kind: "assets:create-folder",
          message: `Created ${path.relative(ROOT, p)}`,
          file: path.relative(ROOT, p),
        });
      }
    }
  }
}

async function wsSchemaSmoke(report: DgccReport, contract: any) {
  const p = path.join(ROOT, "client/public/e2e-smoke.html");
  if (!fs.existsSync(p)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Missing client/public/e2e-smoke.html (required for ws smoke).",
      file: "client/public/e2e-smoke.html",
      hint: "Restore e2e smoke page or update DGCC contract.",
    });
    return;
  }
  if (contract?.rules?.ws?.requireWelcomeStatsShape) {
    const spec = path.join(ROOT, "e2e/smoke.spec.ts");
    if (!fs.existsSync(spec)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: "Missing e2e/smoke.spec.ts (required while requireWelcomeStatsShape is true).",
        file: "e2e/smoke.spec.ts",
      });
      return;
    }
    const src = fs.readFileSync(spec, "utf8");
    const needles = ["welcome", "stats", "gold", "level", "health", "maxHealth", "mana", "maxMana", "skillCooldownUntil"];
    const missing = needles.filter((n) => !src.includes(n));
    if (missing.length) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `e2e/smoke.spec.ts no longer asserts welcome.stats shape (missing: ${missing.join(", ")}).`,
        file: "e2e/smoke.spec.ts",
        hint: "Keep Playwright smoke aligned with the WebSocket welcome payload.",
      });
    }
  }
}

async function uiA11ySmoke(report: DgccReport) {
  const p = path.join(ROOT, "client/public/admin-content.html");
  if (!fs.existsSync(p)) return;
  const html = fs.readFileSync(p, "utf8");
  if (!html.includes('<html lang="')) {
    report.inconsistencies.push({ category: "ui", severity: "warn", message: "admin-content.html missing lang attribute." });
  }
  if (!html.includes('name="viewport"')) {
    report.inconsistencies.push({ category: "ui", severity: "warn", message: "admin-content.html missing viewport meta." });
  }
}

async function main() {
  const mode = parseMode();
  const contract = loadContract();
  const fix = wantFixes(contract, mode);
  printHeader(mode, fix);

  const modeCfg = contract.modes[mode] ?? contract.modes.minimal;

  const report: DgccReport = {
    startedAt: nowIso(),
    finishedAt: nowIso(),
    mode,
    ok: true,
    checks: [],
    inconsistencies: [],
    fixes: [],
    artifacts: {},
  };

  const outDir = path.join(ROOT, "dgcc-artifacts");
  ensureDir(outDir);

  async function runCheck(name: CheckName, fn: () => Promise<void>) {
    const t0 = Date.now();
    try {
      await fn();
      report.checks.push({ name, ok: true, durationMs: Date.now() - t0 });
    } catch (e: any) {
      report.ok = false;
      report.checks.push({ name, ok: false, durationMs: Date.now() - t0, summary: String(e?.message ?? e) });
    }
  }

  const rawChecks = Array.isArray(modeCfg.checks) ? modeCfg.checks : [];
  const unknown = rawChecks.filter((x: string) => !isCheckName(x));
  if (unknown.length) {
    report.inconsistencies.push({
      category: "contract",
      severity: "error",
      message: `Unknown DGCC checks in mode "${mode}": ${unknown.join(", ")}`,
      file: path.relative(ROOT, CONTRACT_PATH),
    });
  }
  const checks = rawChecks.filter(isCheckName);

  if (checks.includes("lint")) {
    await runCheck("lint", async () => {
      const r = await run("pnpm", ["run", "lint"]);
      fs.writeFileSync(path.join(outDir, "lint.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["lint"] = "dgcc-artifacts/lint.out.txt";
      if (r.code !== 0) throw new Error("lint failed");
    });
  }

  if (checks.includes("unit")) {
    await runCheck("unit", async () => {
      const r = await run("pnpm", ["run", "test"]);
      fs.writeFileSync(path.join(outDir, "unit.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["unit"] = "dgcc-artifacts/unit.out.txt";
      if (r.code !== 0) throw new Error("unit tests failed");
    });
  }

  if (checks.includes("e2e")) {
    await runCheck("e2e", async () => {
      const r = await run("pnpm", ["run", "test:e2e:ci"]);
      fs.writeFileSync(path.join(outDir, "e2e.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["e2e"] = "dgcc-artifacts/e2e.out.txt";
      if (r.code !== 0) throw new Error("e2e failed");
    });
  }

  if (checks.includes("contentValidate")) {
    await runCheck("contentValidate", async () => {
      const r = await run("pnpm", ["--prefix", "server", "run", "validate"]);
      fs.writeFileSync(path.join(outDir, "content-validate.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["contentValidate"] = "dgcc-artifacts/content-validate.out.txt";
      if (r.code !== 0) throw new Error("content validation failed (server validate)");
    });
  }

  if (checks.includes("clientBuild")) {
    await runCheck("clientBuild", async () => {
      const r = await run("pnpm", ["--prefix", "client", "run", "build"], {
        env: {
          NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
        },
      });
      fs.writeFileSync(path.join(outDir, "client-build.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["clientBuild"] = "dgcc-artifacts/client-build.out.txt";
      if (r.code !== 0) throw new Error("client build failed");
    });
  }

  if (checks.includes("serverBuild")) {
    await runCheck("serverBuild", async () => {
      const r = await run("pnpm", ["--prefix", "server", "run", "build"]);
      fs.writeFileSync(path.join(outDir, "server-build.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["serverBuild"] = "dgcc-artifacts/server-build.out.txt";
      if (r.code !== 0) throw new Error("server build failed");
    });
  }

  if (checks.includes("assetsAudit")) {
    await runCheck("assetsAudit", async () => {
      await assetsAudit(report, contract, fix);
      const r = await run("pnpm", ["run", "audit:model-paths"]);
      fs.writeFileSync(path.join(outDir, "model-path-audit.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["modelPathAudit"] = "dgcc-artifacts/model-path-audit.out.txt";
      if (r.code !== 0) {
        report.inconsistencies.push({
          category: "assets",
          severity: "error",
          message: "Model path audit failed (pnpm run audit:model-paths).",
          hint: "See dgcc-artifacts/model-path-audit.out.txt",
        });
        throw new Error("model path audit failed");
      }
      const p = path.join(outDir, "assets-audit.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "assets") }, null, 2));
      report.artifacts["assetsAudit"] = "dgcc-artifacts/assets-audit.json";
    });
  }

  if (checks.includes("wsSchemaSmoke")) {
    await runCheck("wsSchemaSmoke", async () => {
      await wsSchemaSmoke(report, contract);
      const p = path.join(outDir, "ws-smoke.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ws") }, null, 2));
      report.artifacts["wsSchemaSmoke"] = "dgcc-artifacts/ws-smoke.json";
      const hasWsError = report.inconsistencies.some((x) => x.category === "ws" && x.severity === "error");
      if (hasWsError) throw new Error("ws schema smoke failed");
    });
  }

  if (checks.includes("uiA11ySmoke")) {
    await runCheck("uiA11ySmoke", async () => {
      await uiA11ySmoke(report);
      const p = path.join(outDir, "ui-a11y.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ui") }, null, 2));
      report.artifacts["uiA11ySmoke"] = "dgcc-artifacts/ui-a11y.json";
    });
  }

  report.finishedAt = nowIso();
  if (report.inconsistencies.some((x) => x.severity === "error")) report.ok = false;

  validateReportShape(report);

  const reportPath = path.join(outDir, "dgcc.report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[DGCC] report: ${path.relative(ROOT, reportPath)}`);
  console.log(`[DGCC] ok=${report.ok ? "true" : "false"} inconsistencies=${report.inconsistencies.length} fixes=${report.fixes.length}`);

  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error("[DGCC] fatal", e);
  process.exit(3);
});

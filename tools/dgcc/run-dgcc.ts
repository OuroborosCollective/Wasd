#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CONTRACT_PATH = path.join(__dirname, "dgcc.contract.json");
const REPORT_SCHEMA_PATH = path.join(__dirname, "dgcc.report.schema.json");

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

function printHeader(mode: string, fix: boolean) {
  console.log(`[DGCC] root=${ROOT} mode=${mode} fix=${fix ? "on" : "off"}`);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function validateContract(raw: unknown, mode: string): { modes: Record<string, { checks?: unknown; fix?: unknown }> } {
  if (!isRecord(raw)) throw new Error("dgcc.contract.json: root must be an object");
  if (!isRecord(raw.modes)) throw new Error("dgcc.contract.json: missing modes object");
  if (!isRecord(raw.modes.minimal)) throw new Error('dgcc.contract.json: missing modes.minimal');
  const modeCfg = raw.modes[mode] ?? raw.modes.minimal;
  if (!isRecord(modeCfg)) throw new Error(`dgcc.contract.json: mode "${mode}" is not an object`);
  const checks = modeCfg.checks;
  if (!Array.isArray(checks)) throw new Error(`dgcc.contract.json: modes.${mode}.checks must be an array`);
  for (const c of checks) {
    if (typeof c !== "string" || !ALL_CHECKS.includes(c as CheckName)) {
      throw new Error(`dgcc.contract.json: unknown check "${String(c)}"`);
    }
  }
  return raw as { modes: Record<string, { checks?: unknown; fix?: unknown }> };
}

/** Minimal draft-2020-12 subset for dgcc.report.schema.json (types + required + enum). */
function validateReportAgainstSchema(report: unknown, schema: unknown): void {
  if (!isRecord(schema) || schema.type !== "object") throw new Error("report schema: root must be type object");
  const req = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const props = isRecord(schema.properties) ? schema.properties : {};

  function checkValue(path: string, val: unknown, subSchema: unknown): void {
    if (!isRecord(subSchema)) return;
    const t = subSchema.type;
    if (t === "string" && typeof val !== "string") throw new Error(`${path}: expected string`);
    if (t === "boolean" && typeof val !== "boolean") throw new Error(`${path}: expected boolean`);
    if (t === "number" && typeof val !== "number") throw new Error(`${path}: expected number`);
    if (t === "object") {
      if (!isRecord(val)) throw new Error(`${path}: expected object`);
      const r2 = Array.isArray(subSchema.required) ? (subSchema.required as string[]) : [];
      const p2 = isRecord(subSchema.properties) ? subSchema.properties : {};
      for (const k of r2) {
        if (!(k in val)) throw new Error(`${path}: missing required "${k}"`);
        checkValue(`${path}.${k}`, val[k], p2[k]);
      }
      for (const k of Object.keys(val)) {
        if (p2[k]) checkValue(`${path}.${k}`, val[k], p2[k]);
      }
      if (subSchema.additionalProperties && isRecord(subSchema.additionalProperties)) {
        for (const k of Object.keys(val)) {
          if (p2[k]) continue;
          checkValue(`${path}.${k}`, val[k], subSchema.additionalProperties);
        }
      }
    }
    if (t === "array") {
      if (!Array.isArray(val)) throw new Error(`${path}: expected array`);
      const items = subSchema.items;
      for (let i = 0; i < val.length; i++) checkValue(`${path}[${i}]`, val[i], items);
    }
    const en = subSchema.enum;
    if (Array.isArray(en) && en.length && !en.includes(val)) {
      throw new Error(`${path}: value not in enum`);
    }
  }

  if (!isRecord(report)) throw new Error("report: root must be an object");
  for (const k of req) {
    if (!(k in report)) throw new Error(`report: missing required "${k}"`);
    checkValue(k, report[k], props[k]);
  }
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

function authContractSmoke(report: DgccReport, contract: any) {
  const required = contract?.rules?.auth?.requiredLoginErrors;
  if (!Array.isArray(required)) return;
  const p = path.join(ROOT, "server/src/modules/auth/resolveLoginIdentity.ts");
  if (!fs.existsSync(p)) {
    report.inconsistencies.push({
      category: "auth",
      severity: "warn",
      message: "Missing server/src/modules/auth/resolveLoginIdentity.ts for auth contract check.",
      file: "server/src/modules/auth/resolveLoginIdentity.ts",
    });
    return;
  }
  const src = fs.readFileSync(p, "utf8");
  for (const code of required) {
    if (typeof code !== "string") continue;
    if (!src.includes(`"${code}"`)) {
      report.inconsistencies.push({
        category: "auth",
        severity: "error",
        message: `Login error code "${code}" not found in resolveLoginIdentity.ts (contract auth.requiredLoginErrors).`,
        file: "server/src/modules/auth/resolveLoginIdentity.ts",
        hint: "Keep LoginError codes aligned with the DGCC contract.",
      });
    }
  }
}

function wsEnvSmoke(report: DgccReport, contract: any) {
  const envName = contract?.rules?.ws?.maxMessageBytesEnv;
  if (typeof envName !== "string" || !envName.trim()) return;
  const gc = path.join(ROOT, "server/src/config/GameConfig.ts");
  if (!fs.existsSync(gc)) return;
  const src = fs.readFileSync(gc, "utf8");
  if (!src.includes(`readPositiveIntEnv("${envName}"`) && !src.includes(envName)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: `GameConfig must honor ${envName} (contract rules.ws.maxMessageBytesEnv).`,
      file: "server/src/config/GameConfig.ts",
    });
  }
}

function welcomeStatsShapeSmoke(report: DgccReport, contract: any) {
  if (!contract?.rules?.ws?.requireWelcomeStatsShape) return;
  const wt = path.join(ROOT, "server/src/core/WorldTick.ts");
  if (!fs.existsSync(wt)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Missing server/src/core/WorldTick.ts for welcome.stats contract.",
      file: "server/src/core/WorldTick.ts",
    });
    return;
  }
  const src = fs.readFileSync(wt, "utf8");
  const welcomeIdx = src.indexOf('type: "welcome"');
  const statsIdx = welcomeIdx >= 0 ? src.indexOf("stats: (() => {", welcomeIdx) : -1;
  if (welcomeIdx < 0 || statsIdx < 0) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Could not locate welcome message stats block in WorldTick.ts.",
      file: "server/src/core/WorldTick.ts",
    });
    return;
  }
  const chunk = src.slice(statsIdx, statsIdx + 12000);
  const must = ["gold:", "level:", "health:", "maxHealth:", "mana:", "maxMana:", "skillCooldownUntil:"];
  for (const key of must) {
    if (!chunk.includes(key)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `welcome.stats must include ${key.replace(":", "")} (contract rules.ws.requireWelcomeStatsShape).`,
        file: "server/src/core/WorldTick.ts",
      });
    }
  }
}

async function wsSchemaSmoke(report: DgccReport, contract: any) {
  const smokePath = path.join(ROOT, "client/public/e2e-smoke.html");
  if (!fs.existsSync(smokePath)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Missing client/public/e2e-smoke.html (required for ws smoke).",
      file: "client/public/e2e-smoke.html",
      hint: "Restore e2e smoke page or update DGCC contract.",
    });
    return;
  }
  const html = fs.readFileSync(smokePath, "utf8");
  for (const needle of ['type: "login"', 'd.type === "welcome"', "/ws"]) {
    if (!html.includes(needle)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `e2e-smoke.html missing expected fragment: ${needle}`,
        file: "client/public/e2e-smoke.html",
      });
    }
  }
  wsEnvSmoke(report, contract);
  welcomeStatsShapeSmoke(report, contract);
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
  const contractRaw = readJson<unknown>(CONTRACT_PATH);
  const contract = validateContract(contractRaw, mode);
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

  const checks = modeCfg.checks as CheckName[];

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
      await assetsAudit(report, contractRaw, fix);
      const p = path.join(outDir, "assets-audit.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "assets") }, null, 2));
      report.artifacts["assetsAudit"] = "dgcc-artifacts/assets-audit.json";
    });
  }

  if (checks.includes("wsSchemaSmoke")) {
    await runCheck("wsSchemaSmoke", async () => {
      authContractSmoke(report, contractRaw);
      await wsSchemaSmoke(report, contractRaw);
      const p = path.join(outDir, "ws-smoke.json");
      fs.writeFileSync(
        p,
        JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ws" || x.category === "auth") }, null, 2)
      );
      report.artifacts["wsSchemaSmoke"] = "dgcc-artifacts/ws-smoke.json";
      const hasErr = report.inconsistencies.some(
        (x) => (x.category === "ws" || x.category === "auth") && x.severity === "error"
      );
      if (hasErr) throw new Error("ws schema smoke failed");
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

  const reportSchema = readJson<unknown>(REPORT_SCHEMA_PATH);
  try {
    validateReportAgainstSchema(report, reportSchema);
  } catch (e: any) {
    report.ok = false;
    report.inconsistencies.push({
      category: "dgcc",
      severity: "error",
      message: `Report failed schema validation: ${String(e?.message ?? e)}`,
      file: "tools/dgcc/dgcc.report.schema.json",
    });
  }

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

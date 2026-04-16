#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
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

/** Keys the Playwright e2e smoke expects on `welcome.stats` (keep in sync with `e2e/smoke.spec.ts`). */
const WELCOME_STATS_SHAPE_KEYS = [
  "gold",
  "level",
  "health",
  "maxHealth",
  "mana",
  "maxMana",
  "skillCooldownUntil",
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

function resolvePnpmExecutable(): string {
  const override = process.env.DGCC_PNPM?.trim();
  if (override) return override;
  try {
    if (process.platform === "win32") {
      const out = execSync("where pnpm", { encoding: "utf8" }).split(/\r?\n/)[0]?.trim();
      if (out) return out;
    } else {
      const out = execSync("command -v pnpm", { encoding: "utf8" }).trim();
      if (out) return out;
    }
  } catch {
    /* ignore */
  }
  return "pnpm";
}

function run(cmd: string, args: string[], opts?: { env?: Record<string, string> }) {
  return new Promise<{ code: number; stdout: string; stderr: string; durationMs: number }>((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: false,
      env: { ...process.env, ...(opts?.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("error", (err) => {
      stderr += `\n[spawn] ${String((err as NodeJS.ErrnoException)?.message ?? err)}`;
      resolve({ code: 1, stdout, stderr, durationMs: Date.now() - t0 });
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr, durationMs: Date.now() - t0 }));
  });
}

function runPnpm(args: string[], opts?: { env?: Record<string, string> }) {
  const bin = resolvePnpmExecutable();
  return run(bin, args, opts);
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
  console.log(`[DGCC] mode=${mode} fix=${fix ? "on" : "off"} pnpm=${resolvePnpmExecutable()}`);
}

function readUtf8IfExists(rel: string): string | null {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function assertFileContains(rel: string, needle: string, category: string, severity: Severity, message: string, report: DgccReport) {
  const text = readUtf8IfExists(rel);
  if (text == null) {
    report.inconsistencies.push({ category, severity: "error", message: `Missing file: ${rel}`, file: rel });
    return;
  }
  if (!text.includes(needle)) {
    report.inconsistencies.push({ category, severity, message, file: rel });
  }
}

function authContractSmoke(report: DgccReport, contract: { rules?: { auth?: { requiredLoginErrors?: string[] } } }) {
  const required = contract.rules?.auth?.requiredLoginErrors ?? [];
  const src = readUtf8IfExists("server/src/modules/auth/resolveLoginIdentity.ts");
  if (!src) {
    report.inconsistencies.push({
      category: "auth",
      severity: "error",
      message: "Missing server/src/modules/auth/resolveLoginIdentity.ts for auth contract check.",
      file: "server/src/modules/auth/resolveLoginIdentity.ts",
    });
    return;
  }
  for (const code of required) {
    if (!src.includes(`"${code}"`)) {
      report.inconsistencies.push({
        category: "auth",
        severity: "error",
        message: `Login error code "${code}" not found in resolveLoginIdentity (DGCC auth.requiredLoginErrors).`,
        file: "server/src/modules/auth/resolveLoginIdentity.ts",
      });
    }
  }
}

function wsContractSmoke(
  report: DgccReport,
  contract: { rules?: { ws?: { maxMessageBytesEnv?: string; requireWelcomeStatsShape?: boolean } } }
) {
  const envName = contract.rules?.ws?.maxMessageBytesEnv ?? "WS_MAX_MESSAGE_BYTES";
  assertFileContains(
    "server/src/config/resolveWsMaxMessageBytes.ts",
    `process.env.${envName}`,
    "ws",
    "error",
    `WS max-bytes resolver must read process.env.${envName} (DGCC contract).`,
    report
  );
  assertFileContains(
    "server/src/networking/WebSocketServer.ts",
    "resolveWsMaxMessageBytes()",
    "ws",
    "error",
    "WebSocketServer must enforce max message size via resolveWsMaxMessageBytes().",
    report
  );

  if (contract.rules?.ws?.requireWelcomeStatsShape) {
    const e2eSpec = readUtf8IfExists("e2e/smoke.spec.ts");
    if (!e2eSpec) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: "Missing e2e/smoke.spec.ts (required for welcome.stats shape contract).",
        file: "e2e/smoke.spec.ts",
      });
      return;
    }
    for (const key of WELCOME_STATS_SHAPE_KEYS) {
      if (!e2eSpec.includes(key)) {
        report.inconsistencies.push({
          category: "ws",
          severity: "error",
          message: `e2e smoke spec must assert welcome.stats.${key} (DGCC ws.requireWelcomeStatsShape).`,
          file: "e2e/smoke.spec.ts",
          hint: "Keep WELCOME_STATS_SHAPE_KEYS in tools/dgcc/run-dgcc.ts aligned with the spec.",
        });
      }
    }
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
  const mustHave = ["characters", "monsters", "npcs", "objects", "items", "resources"].map((x) => path.join(clientDir, x));
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
  }
  authContractSmoke(report, contract);
  wsContractSmoke(report, contract);
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
  const contract = readJson<any>(CONTRACT_PATH);
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
      const r = await runPnpm(["run", "lint"]);
      fs.writeFileSync(path.join(outDir, "lint.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["lint"] = "dgcc-artifacts/lint.out.txt";
      if (r.code !== 0) throw new Error("lint failed");
    });
  }

  if (checks.includes("unit")) {
    await runCheck("unit", async () => {
      const r = await runPnpm(["run", "test"]);
      fs.writeFileSync(path.join(outDir, "unit.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["unit"] = "dgcc-artifacts/unit.out.txt";
      if (r.code !== 0) throw new Error("unit tests failed");
    });
  }

  if (checks.includes("e2e")) {
    await runCheck("e2e", async () => {
      const r = await runPnpm(["run", "test:e2e:ci"]);
      fs.writeFileSync(path.join(outDir, "e2e.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["e2e"] = "dgcc-artifacts/e2e.out.txt";
      if (r.code !== 0) throw new Error("e2e failed");
    });
  }

  if (checks.includes("contentValidate")) {
    await runCheck("contentValidate", async () => {
      const r = await runPnpm(["--prefix", "server", "run", "validate"]);
      fs.writeFileSync(path.join(outDir, "content-validate.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["contentValidate"] = "dgcc-artifacts/content-validate.out.txt";
      if (r.code !== 0) throw new Error("content validation failed (pnpm --prefix server run validate)");
    });
  }

  if (checks.includes("clientBuild")) {
    await runCheck("clientBuild", async () => {
      const r = await runPnpm(["--prefix", "client", "run", "build"], {
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
      const r = await runPnpm(["--prefix", "server", "run", "build"]);
      fs.writeFileSync(path.join(outDir, "server-build.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["serverBuild"] = "dgcc-artifacts/server-build.out.txt";
      if (r.code !== 0) throw new Error("server build failed");
    });
  }

  if (checks.includes("assetsAudit")) {
    await runCheck("assetsAudit", async () => {
      await assetsAudit(report, contract, fix);
      const p = path.join(outDir, "assets-audit.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "assets") }, null, 2));
      report.artifacts["assetsAudit"] = "dgcc-artifacts/assets-audit.json";
    });
  }

  if (checks.includes("wsSchemaSmoke")) {
    await runCheck("wsSchemaSmoke", async () => {
      await wsSchemaSmoke(report, contract);
      const p = path.join(outDir, "ws-smoke.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ws" || x.category === "auth") }, null, 2));
      report.artifacts["wsSchemaSmoke"] = "dgcc-artifacts/ws-smoke.json";
      const hasWsAuthError = report.inconsistencies.some(
        (x) => (x.category === "ws" || x.category === "auth") && x.severity === "error"
      );
      if (hasWsAuthError) throw new Error("ws / auth schema smoke failed");
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

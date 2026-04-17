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

function findRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    const contractAt = path.join(dir, "tools", "dgcc", "dgcc.contract.json");
    if (fs.existsSync(contractAt)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(startDir);
    dir = parent;
  }
}

const ROOT = findRepoRoot(process.cwd());
const CONTRACT_PATH = path.join(ROOT, "tools", "dgcc", "dgcc.contract.json");

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
  const eq = process.argv.find((x) => x.startsWith("--mode="));
  if (eq) return eq.split("=", 2)[1]?.trim() || "minimal";
  const idx = process.argv.indexOf("--mode");
  if (idx >= 0 && process.argv[idx + 1]) return String(process.argv[idx + 1]).trim();
  return (process.env.DGCC_MODE || "minimal").trim();
}

function wantFixes(contract: { modes?: Record<string, { fix?: { enabled?: boolean } }> }, mode: string) {
  if (process.env.DGCC_FIX === "1") return true;
  if (process.env.DGCC_FIX === "0") return false;
  const modeFix = contract.modes?.[mode]?.fix?.enabled;
  if (typeof modeFix === "boolean") return modeFix;
  return mode === "extreme";
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

function enforceAuthContract(report: DgccReport, contract: any) {
  const required: string[] = contract?.rules?.auth?.requiredLoginErrors;
  if (!Array.isArray(required) || !required.length) return;
  const loginPath = path.join(ROOT, "server/src/modules/auth/resolveLoginIdentity.ts");
  if (!fs.existsSync(loginPath)) {
    report.inconsistencies.push({
      category: "auth",
      severity: "error",
      message: "resolveLoginIdentity.ts missing; cannot verify auth error contract.",
      file: "server/src/modules/auth/resolveLoginIdentity.ts",
    });
    return;
  }
  const src = fs.readFileSync(loginPath, "utf8");
  for (const code of required) {
    if (typeof code !== "string" || !code.trim()) continue;
    const needle = `code: "${code}"`;
    if (!src.includes(needle)) {
      report.inconsistencies.push({
        category: "auth",
        severity: "error",
        message: `Login error contract requires code "${code}" in resolveLoginIdentity.`,
        file: "server/src/modules/auth/resolveLoginIdentity.ts",
        hint: `Ensure ${needle} is emitted for the appropriate failure paths.`,
      });
    }
  }
}

function enforceWelcomeStatsShape(report: DgccReport, contract: any) {
  if (!contract?.rules?.ws?.requireWelcomeStatsShape) return;
  const worldTick = path.join(ROOT, "server/src/core/WorldTick.ts");
  if (!fs.existsSync(worldTick)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "WorldTick.ts missing; cannot verify welcome.stats shape.",
      file: "server/src/core/WorldTick.ts",
    });
    return;
  }
  const src = fs.readFileSync(worldTick, "utf8");
  const welcomeIdx = src.indexOf('type: "welcome"');
  if (welcomeIdx < 0) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: 'WorldTick.ts has no type: "welcome" WebSocket payload.',
      file: "server/src/core/WorldTick.ts",
    });
    return;
  }
  const segment = src.slice(welcomeIdx, Math.min(src.length, welcomeIdx + 6000));
  const statsKeys = [
    "gold",
    "xp",
    "level",
    "health",
    "maxHealth",
    "stamina",
    "maxStamina",
    "mana",
    "maxMana",
    "inventory",
    "equipment",
  ];
  for (const k of statsKeys) {
    const re = new RegExp(`\\b${k}\\s*:`);
    if (!re.test(segment)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `welcome.stats contract: missing "${k}" in welcome payload near WorldTick login.`,
        file: "server/src/core/WorldTick.ts",
      });
    }
  }
}

function warnWsEnvContract(report: DgccReport, contract: any) {
  const envName = contract?.rules?.ws?.maxMessageBytesEnv;
  if (typeof envName !== "string" || !envName.trim()) return;
  const serverRoot = path.join(ROOT, "server", "src");
  if (!fs.existsSync(serverRoot)) return;
  let hit = false;
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.endsWith(".ts")) {
        const t = fs.readFileSync(full, "utf8");
        if (t.includes(envName)) hit = true;
      }
    }
  };
  walk(serverRoot);
  if (!hit) {
    report.inconsistencies.push({
      category: "ws",
      severity: "warn",
      message: `Contract names WS env ${envName}, but server sources do not reference it (yet).`,
      hint: "Wire the limit in WebSocketServer or relax the contract field.",
    });
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
  enforceAuthContract(report, contract);
  enforceWelcomeStatsShape(report, contract);
  warnWsEnvContract(report, contract);
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

function validateReportShape(report: DgccReport) {
  const top = ["startedAt", "finishedAt", "mode", "ok", "checks", "inconsistencies", "fixes", "artifacts"] as const;
  for (const k of top) {
    if (!(k in report) || report[k as keyof DgccReport] === undefined) {
      throw new Error(`DGCC report missing required field: ${k}`);
    }
  }
  if (!Array.isArray(report.checks)) throw new Error("DGCC report checks must be an array");
  for (const c of report.checks) {
    if (typeof c.name !== "string" || typeof c.ok !== "boolean" || typeof c.durationMs !== "number") {
      throw new Error("DGCC report check entry invalid shape");
    }
  }
  if (!Array.isArray(report.inconsistencies)) throw new Error("DGCC report inconsistencies must be an array");
  for (const i of report.inconsistencies) {
    if (typeof i.category !== "string" || typeof i.severity !== "string" || typeof i.message !== "string") {
      throw new Error("DGCC report inconsistency entry invalid shape");
    }
  }
  if (!Array.isArray(report.fixes)) throw new Error("DGCC report fixes must be an array");
  for (const f of report.fixes) {
    if (typeof f.kind !== "string" || typeof f.message !== "string") {
      throw new Error("DGCC report fix entry invalid shape");
    }
  }
  if (!report.artifacts || typeof report.artifacts !== "object" || Array.isArray(report.artifacts)) {
    throw new Error("DGCC report artifacts must be an object");
  }
  for (const [k, v] of Object.entries(report.artifacts)) {
    if (typeof k !== "string" || typeof v !== "string") {
      throw new Error("DGCC report artifacts must map string -> string");
    }
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

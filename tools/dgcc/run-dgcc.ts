#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "info" | "warn" | "error";
type CheckName =
  | "lint"
  | "unit"
  | "checkInteract"
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Monorepo root (stable even when cwd is `server/` or `client/`). */
const ROOT = path.resolve(__dirname, "../..");
const CONTRACT_PATH = path.join(ROOT, "tools/dgcc/dgcc.contract.json");

const WELCOME_STATS_SOURCE_KEYS = [
  "gold",
  "xp",
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

function validateContract(contract: unknown): asserts contract is {
  modes: Record<string, { checks?: unknown; fix?: { enabled?: boolean } }>;
  rules: {
    assets: { clientModelsDir: string };
    ws?: { maxMessageBytesEnv?: string; requireWelcomeStatsShape?: boolean };
    auth?: { requiredLoginErrors?: string[] };
  };
} {
  if (!contract || typeof contract !== "object") throw new Error("DGCC contract: invalid root object");
  const c = contract as Record<string, unknown>;
  if (!c.modes || typeof c.modes !== "object") throw new Error("DGCC contract: missing modes");
  if (!c.rules || typeof c.rules !== "object") throw new Error("DGCC contract: missing rules");
  const rules = c.rules as Record<string, unknown>;
  if (!rules.assets || typeof rules.assets !== "object") throw new Error("DGCC contract: missing rules.assets");
  const assets = rules.assets as Record<string, unknown>;
  if (typeof assets.clientModelsDir !== "string" || !assets.clientModelsDir.trim()) {
    throw new Error("DGCC contract: rules.assets.clientModelsDir must be a non-empty string");
  }
  for (const [name, cfg] of Object.entries(c.modes as Record<string, unknown>)) {
    if (!cfg || typeof cfg !== "object") throw new Error(`DGCC contract: modes.${name} must be an object`);
    const checks = (cfg as { checks?: unknown }).checks;
    if (!Array.isArray(checks) || checks.some((x) => typeof x !== "string")) {
      throw new Error(`DGCC contract: modes.${name}.checks must be an array of strings`);
    }
  }
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      collectSourceFiles(p, acc);
    } else if (ent.isFile() && (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx") || ent.name.endsWith(".js"))) {
      acc.push(p);
    }
  }
  return acc;
}

function authContractSmoke(report: DgccReport, contract: { rules?: { auth?: { requiredLoginErrors?: string[] } } }) {
  const errs = contract.rules?.auth?.requiredLoginErrors;
  if (!Array.isArray(errs) || errs.length === 0) return;
  const serverSrc = path.join(ROOT, "server/src");
  const files = collectSourceFiles(serverSrc);
  const corpus = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const code of errs) {
    if (typeof code !== "string" || !code.trim()) continue;
    if (!corpus.includes(code)) {
      report.inconsistencies.push({
        category: "auth",
        severity: "error",
        message: `Contract requires login-related surface "${code}" but it was not found under server/src.`,
        hint: "Ensure WS/HTTP auth errors still expose this code string for clients.",
      });
    }
  }
}

function welcomeStatsShapeSmoke(
  report: DgccReport,
  contract: { rules?: { ws?: { requireWelcomeStatsShape?: boolean } } }
) {
  if (!contract.rules?.ws?.requireWelcomeStatsShape) return;
  const worldTick = path.join(ROOT, "server/src/core/WorldTick.ts");
  if (!fs.existsSync(worldTick)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Expected server/src/core/WorldTick.ts for welcome.stats contract check.",
      file: "server/src/core/WorldTick.ts",
    });
    return;
  }
  const src = fs.readFileSync(worldTick, "utf8");
  if (!src.includes('type: "welcome"')) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "WorldTick welcome payload must include type: \"welcome\".",
      file: "server/src/core/WorldTick.ts",
    });
  }
  if (!src.includes("stats:")) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "WorldTick welcome payload must include a stats object.",
      file: "server/src/core/WorldTick.ts",
    });
  }
  for (const key of WELCOME_STATS_SOURCE_KEYS) {
    if (!src.includes(`${key}:`)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `welcome.stats shape drift: missing field source "${key}:" in WorldTick welcome stats.`,
        file: "server/src/core/WorldTick.ts",
        hint: "Keep welcome.stats aligned with client expectations.",
      });
    }
  }
}

function wsMaxMessageBytesEnvSmoke(
  report: DgccReport,
  contract: { rules?: { ws?: { maxMessageBytesEnv?: string } } }
) {
  const envName = contract.rules?.ws?.maxMessageBytesEnv?.trim();
  if (!envName) return;
  const gameConfig = path.join(ROOT, "server/src/config/GameConfig.ts");
  if (!fs.existsSync(gameConfig)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "warn",
      message: "Could not find server/src/config/GameConfig.ts for WS max-bytes env check.",
    });
    return;
  }
  const src = fs.readFileSync(gameConfig, "utf8");
  if (!src.includes(envName)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: `GameConfig must honor contract env ${envName} for max WebSocket message size.`,
      file: "server/src/config/GameConfig.ts",
      hint: `Read process.env.${envName} when setting wsMaxMessageBytes.`,
    });
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
  welcomeStatsShapeSmoke(report, contract);
  wsMaxMessageBytesEnvSmoke(report, contract);
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

type DgccContract = {
  modes: Record<string, { checks?: CheckName[]; fix?: { enabled?: boolean } }>;
  rules: {
    assets: { clientModelsDir: string };
    ws?: { maxMessageBytesEnv?: string; requireWelcomeStatsShape?: boolean };
    auth?: { requiredLoginErrors?: string[] };
  };
};

async function main() {
  const mode = parseMode();
  let contract: DgccContract;
  try {
    contract = readJson<DgccContract>(CONTRACT_PATH);
    validateContract(contract);
  } catch (e: any) {
    console.error("[DGCC] contract error", e?.message ?? e);
    process.exit(3);
  }

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

  try {
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

    if (checks.includes("checkInteract")) {
      await runCheck("checkInteract", async () => {
        const r = await run("pnpm", ["run", "check:interact"]);
        fs.writeFileSync(path.join(outDir, "check-interact.out.txt"), r.stdout + "\n" + r.stderr);
        report.artifacts["checkInteract"] = "dgcc-artifacts/check-interact.out.txt";
        if (r.code !== 0) throw new Error("interact distance consistency check failed");
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
        fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ws" || x.category === "auth") }, null, 2));
        report.artifacts["wsSchemaSmoke"] = "dgcc-artifacts/ws-smoke.json";
        const hasWsError = report.inconsistencies.some(
          (x) => (x.category === "ws" || x.category === "auth") && x.severity === "error"
        );
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
  } finally {
    report.finishedAt = nowIso();
    if (report.inconsistencies.some((x) => x.severity === "error")) report.ok = false;

    const reportPath = path.join(outDir, "dgcc.report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[DGCC] report: ${path.relative(ROOT, reportPath)}`);
    console.log(`[DGCC] ok=${report.ok ? "true" : "false"} inconsistencies=${report.inconsistencies.length} fixes=${report.fixes.length}`);
  }

  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error("[DGCC] fatal", e);
  process.exit(3);
});

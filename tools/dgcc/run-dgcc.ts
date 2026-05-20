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

const ALL_CHECKS: CheckName[] = [
  "lint",
  "unit",
  "e2e",
  "contentValidate",
  "assetsAudit",
  "wsSchemaSmoke",
  "uiA11ySmoke",
  "clientBuild",
  "serverBuild",
];

function isCheckName(x: string): x is CheckName {
  for (const c of ALL_CHECKS) {
    if (c === x) return true;
  }
  return false;
}

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

async function wsSchemaSmoke(report: DgccReport) {
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

function writeReport(outDir: string, report: DgccReport) {
  report.finishedAt = nowIso();
  if (report.inconsistencies.some((x) => x.severity === "error")) report.ok = false;
  const reportPath = path.join(outDir, "dgcc.report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[DGCC] report: ${path.relative(ROOT, reportPath)}`);
  console.log(`[DGCC] ok=${report.ok ? "true" : "false"} inconsistencies=${report.inconsistencies.length} fixes=${report.fixes.length}`);
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
    } catch (e: unknown) {
      report.ok = false;
      const msg = e instanceof Error ? e.message : String(e);
      report.checks.push({ name, ok: false, durationMs: Date.now() - t0, summary: msg });
    }
  }

  const rawChecks = modeCfg.checks as string[];

  const checkRunners: Record<CheckName, () => Promise<void>> = {
    lint: async () => {
      const r = await run("pnpm", ["run", "lint"]);
      fs.writeFileSync(path.join(outDir, "lint.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["lint"] = "dgcc-artifacts/lint.out.txt";
      if (r.code !== 0) throw new Error("lint failed");
    },
    unit: async () => {
      const r = await run("pnpm", ["run", "test"]);
      fs.writeFileSync(path.join(outDir, "unit.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["unit"] = "dgcc-artifacts/unit.out.txt";
      if (r.code !== 0) throw new Error("unit tests failed");
    },
    e2e: async () => {
      const r = await run("pnpm", ["run", "test:e2e:ci"]);
      fs.writeFileSync(path.join(outDir, "e2e.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["e2e"] = "dgcc-artifacts/e2e.out.txt";
      if (r.code !== 0) throw new Error("e2e failed");
    },
    contentValidate: async () => {
      const r = await run("pnpm", ["run", "validate"]);
      fs.writeFileSync(path.join(outDir, "content-validate.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["contentValidate"] = "dgcc-artifacts/content-validate.out.txt";
      if (r.code !== 0) throw new Error("content validation failed");
    },
    clientBuild: async () => {
      const r = await run("pnpm", ["--prefix", "client", "run", "build"], {
        env: {
          NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
        },
      });
      fs.writeFileSync(path.join(outDir, "client-build.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["clientBuild"] = "dgcc-artifacts/client-build.out.txt";
      if (r.code !== 0) throw new Error("client build failed");
    },
    serverBuild: async () => {
      const r = await run("pnpm", ["--prefix", "server", "run", "build"]);
      fs.writeFileSync(path.join(outDir, "server-build.out.txt"), r.stdout + "\n" + r.stderr);
      report.artifacts["serverBuild"] = "dgcc-artifacts/server-build.out.txt";
      if (r.code !== 0) throw new Error("server build failed");
    },
    assetsAudit: async () => {
      await assetsAudit(report, contract, fix);
      const p = path.join(outDir, "assets-audit.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "assets") }, null, 2));
      report.artifacts["assetsAudit"] = "dgcc-artifacts/assets-audit.json";
    },
    wsSchemaSmoke: async () => {
      await wsSchemaSmoke(report);
      const p = path.join(outDir, "ws-smoke.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ws") }, null, 2));
      report.artifacts["wsSchemaSmoke"] = "dgcc-artifacts/ws-smoke.json";
      const hasWsError = report.inconsistencies.some((x) => x.category === "ws" && x.severity === "error");
      if (hasWsError) throw new Error("ws schema smoke failed");
    },
    uiA11ySmoke: async () => {
      await uiA11ySmoke(report);
      const p = path.join(outDir, "ui-a11y.json");
      fs.writeFileSync(p, JSON.stringify({ inconsistencies: report.inconsistencies.filter((x) => x.category === "ui") }, null, 2));
      report.artifacts["uiA11ySmoke"] = "dgcc-artifacts/ui-a11y.json";
    },
  };

  for (const raw of rawChecks) {
    if (!isCheckName(raw)) {
      report.inconsistencies.push({
        category: "dgcc",
        severity: "warn",
        message: `Unknown check in contract: ${raw}`,
        hint: `Expected one of: ${ALL_CHECKS.join(", ")}`,
      });
      continue;
    }
    await runCheck(raw, checkRunners[raw]);
  }

  writeReport(outDir, report);
  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error("[DGCC] fatal", e);
  try {
    const outDir = path.join(ROOT, "dgcc-artifacts");
    ensureDir(outDir);
    const fatalReport: DgccReport = {
      startedAt: nowIso(),
      finishedAt: nowIso(),
      mode: parseMode(),
      ok: false,
      checks: [],
      inconsistencies: [
        {
          category: "dgcc",
          severity: "error",
          message: e instanceof Error ? e.message : String(e),
        },
      ],
      fixes: [],
      artifacts: {},
    };
    writeReport(outDir, fatalReport);
  } catch {
    // ignore secondary failures
  }
  process.exit(3);
});

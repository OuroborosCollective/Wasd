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
  return new Promise<{ code: number; stdout: string; stderr: string; durationMs: number }>((resolve, reject) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: process.platform === "win32",
      env: { ...process.env, ...(opts?.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += String(d)));
    child.stderr?.on("data", (d) => (stderr += String(d)));
    child.on("error", (err) => reject(err));
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

function authContractSmoke(report: DgccReport, contract: any) {
  const required = contract?.rules?.auth?.requiredLoginErrors as string[] | undefined;
  if (!required?.length) return;
  const p = path.join(ROOT, "server/src/modules/auth/resolveLoginIdentity.ts");
  if (!fs.existsSync(p)) {
    report.inconsistencies.push({
      category: "auth",
      severity: "error",
      message: "Missing server/src/modules/auth/resolveLoginIdentity.ts (auth contract check).",
      file: "server/src/modules/auth/resolveLoginIdentity.ts",
    });
    return;
  }
  const text = fs.readFileSync(p, "utf8");
  for (const code of required) {
    const needle = `"${code}"`;
    if (!text.includes(needle)) {
      report.inconsistencies.push({
        category: "auth",
        severity: "error",
        message: `Login error code "${code}" not found in resolveLoginIdentity (contract requires it).`,
        file: "server/src/modules/auth/resolveLoginIdentity.ts",
        hint: "Return this code from the appropriate login failure branches.",
      });
    }
  }
}

function wsMaxMessageEnvSmoke(report: DgccReport, contract: any) {
  const envName = contract?.rules?.ws?.maxMessageBytesEnv as string | undefined;
  if (!envName?.trim()) return;
  const serverDir = path.join(ROOT, "server/src");
  if (!fs.existsSync(serverDir)) return;
  let found = false;
  for (const ent of fs.readdirSync(serverDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".ts")) continue;
    const t = fs.readFileSync(path.join(serverDir, ent.name), "utf8");
    if (t.includes(envName)) {
      found = true;
      break;
    }
  }
  const net = path.join(ROOT, "server/src/networking");
  if (fs.existsSync(net)) {
    for (const ent of fs.readdirSync(net, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith(".ts")) continue;
      const t = fs.readFileSync(path.join(net, ent.name), "utf8");
      if (t.includes(envName)) {
        found = true;
        break;
      }
    }
  }
  if (!found) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: `Contract references ${envName} but server source does not read this env var.`,
      hint: "Wire env override next to ws max message handling (e.g. WebSocketServer).",
    });
  }
}

function welcomeStatsShapeSmoke(report: DgccReport, contract: any) {
  if (!contract?.rules?.ws?.requireWelcomeStatsShape) return;
  const spec = path.join(ROOT, "e2e/smoke.spec.ts");
  if (!fs.existsSync(spec)) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "Missing e2e/smoke.spec.ts (required for welcome.stats shape contract).",
      file: "e2e/smoke.spec.ts",
    });
    return;
  }
  const must = ["gold", "level", "health", "maxHealth", "mana", "maxMana", "skillCooldownUntil"];
  const text = fs.readFileSync(spec, "utf8");
  for (const key of must) {
    if (!text.includes(key)) {
      report.inconsistencies.push({
        category: "ws",
        severity: "error",
        message: `e2e/smoke.spec.ts does not reference expected welcome.stats field "${key}".`,
        file: "e2e/smoke.spec.ts",
        hint: "Keep smoke spec aligned with welcome.stats contract.",
      });
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
  authContractSmoke(report, contract);
  wsMaxMessageEnvSmoke(report, contract);
  welcomeStatsShapeSmoke(report, contract);

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
  const html = fs.readFileSync(p, "utf8");
  if (!html.includes('id="e2e-welcome"') || !html.includes('id="e2e-status"')) {
    report.inconsistencies.push({
      category: "ws",
      severity: "error",
      message: "e2e-smoke.html missing expected e2e hooks (elements #e2e-status and #e2e-welcome).",
      file: "client/public/e2e-smoke.html",
    });
  }
}

async function uiA11ySmoke(report: DgccReport, contract: any) {
  const p = path.join(ROOT, "client/public/admin-content.html");
  if (!fs.existsSync(p)) return;
  const html = fs.readFileSync(p, "utf8");
  if (!html.includes('<html lang="')) {
    report.inconsistencies.push({ category: "ui", severity: "warn", message: "admin-content.html missing lang attribute." });
  }
  if (!html.includes('name="viewport"')) {
    report.inconsistencies.push({ category: "ui", severity: "warn", message: "admin-content.html missing viewport meta." });
  }
  if (contract?.rules?.ui?.requireAriaLabelsOnButtons) {
    const btnRe = /<button\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = btnRe.exec(html))) {
      const tag = m[0];
      if (/aria-label\s*=/.test(tag) || /aria-labelledby\s*=/.test(tag)) continue;
      report.inconsistencies.push({
        category: "ui",
        severity: "warn",
        message: "admin-content.html has a <button> without aria-label / aria-labelledby.",
        file: "client/public/admin-content.html",
        hint: "Add aria-label for icon-only or unlabeled buttons.",
      });
      break;
    }
  }
  if (contract?.rules?.ui?.requireTitleOnIconButtons) {
    const iconBtnRe = /<button\b[^>]*class="[^"]*\bicon-btn\b[^"]*"[^>]*>/gi;
    let im: RegExpExecArray | null;
    while ((im = iconBtnRe.exec(html))) {
      const tag = im[0];
      if (/\btitle\s*=/.test(tag)) continue;
      report.inconsistencies.push({
        category: "ui",
        severity: "warn",
        message: "admin-content.html has an icon-btn <button> without title= (tooltip / hover label).",
        file: "client/public/admin-content.html",
      });
      break;
    }
  }
}

async function ensureClientDistForE2e(report: DgccReport, outDir: string, fix: boolean) {
  const index = path.join(ROOT, "client/dist/index.html");
  if (fs.existsSync(index)) return;
  if (!fix) {
    report.inconsistencies.push({
      category: "e2e",
      severity: "error",
      message: "client/dist/index.html missing; E2E production server cannot serve the SPA.",
      hint: "Run DGCC with fix enabled, extreme mode, or run `pnpm --prefix client run build` before e2e.",
    });
    return;
  }
  console.log("[DGCC] client/dist missing — running client build before e2e…");
  const r = await run("pnpm", ["--prefix", "client", "run", "build"], {
    env: {
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
    },
  });
  fs.writeFileSync(path.join(outDir, "e2e-preflight-client-build.out.txt"), r.stdout + "\n" + r.stderr);
  report.artifacts["e2ePreflightClientBuild"] = "dgcc-artifacts/e2e-preflight-client-build.out.txt";
  if (r.code !== 0) {
    report.inconsistencies.push({
      category: "e2e",
      severity: "error",
      message: "Pre-e2e client build failed.",
      hint: String(r.stderr || r.stdout).slice(0, 500),
    });
  } else {
    report.fixes.push({
      kind: "e2e:client-build-preflight",
      message: "Built client before e2e because client/dist was missing.",
    });
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
      await ensureClientDistForE2e(report, outDir, fix);
      if (report.inconsistencies.some((x) => x.category === "e2e" && x.severity === "error")) {
        throw new Error("e2e preflight failed");
      }
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
      await uiA11ySmoke(report, contract);
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

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

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../..");
const CONTRACT_PATH = path.join(SCRIPT_DIR, "dgcc.contract.json");

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
  console.log(`[DGCC] root=${ROOT} mode=${mode} fix=${fix ? "on" : "off"}`);
}

function verifyAuthLoginErrors(contract: { rules?: { auth?: { requiredLoginErrors?: string[] } } }) {
  const required = contract.rules?.auth?.requiredLoginErrors;
  if (!required?.length) return;
  const serverSrc = path.join(ROOT, "server/src");
  if (!fs.existsSync(serverSrc)) return;
  const missing: string[] = [];
  for (const err of required) {
    const hit = grepRecursiveString(serverSrc, err, [".ts"]);
    if (!hit) missing.push(err);
  }
  if (missing.length) {
    return {
      category: "auth" as const,
      severity: "warn" as const,
      message: `Expected login error strings not found under server/src: ${missing.join(", ")}`,
      hint: "Ensure WS/auth responses use these codes where applicable.",
    };
  }
  return undefined;
}

function grepRecursiveString(dir: string, needle: string, exts: string[]): boolean {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === "dist") continue;
        stack.push(full);
        continue;
      }
      if (!exts.some((e) => ent.name.endsWith(e))) continue;
      try {
        const txt = fs.readFileSync(full, "utf8");
        if (txt.includes(needle)) return true;
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

function verifyWelcomeStatsShapeInE2e() {
  const spec = path.join(ROOT, "e2e/smoke.spec.ts");
  if (!fs.existsSync(spec)) {
    return {
      category: "ws" as const,
      severity: "error" as const,
      message: "Missing e2e/smoke.spec.ts (required for welcome.stats shape guard).",
      file: "e2e/smoke.spec.ts",
    };
  }
  const src = fs.readFileSync(spec, "utf8");
  const need = ["welcome.stats", "gold", "level", "health", "maxHealth", "mana", "maxMana", "skillCooldownUntil"];
  const absent = need.filter((k) => !src.includes(k));
  if (absent.length) {
    return {
      category: "ws" as const,
      severity: "error" as const,
      message: `e2e/smoke.spec.ts must assert welcome.stats shape; missing references: ${absent.join(", ")}`,
      file: "e2e/smoke.spec.ts",
      hint: "Keep smoke e2e aligned with the welcome message contract.",
    };
  }
  return undefined;
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
  if (contract.rules?.ws?.requireWelcomeStatsShape) {
    const inc = verifyWelcomeStatsShapeInE2e();
    if (inc) report.inconsistencies.push(inc);
  }
  const envName = contract.rules?.ws?.maxMessageBytesEnv as string | undefined;
  if (envName) {
    const serverEnv = path.join(ROOT, "server/.env.example");
    const rootEnv = path.join(ROOT, ".env.example");
    let documented = false;
    for (const f of [serverEnv, rootEnv]) {
      if (fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(envName)) {
        documented = true;
        break;
      }
    }
    if (!documented) {
      report.inconsistencies.push({
        category: "ws",
        severity: "info",
        message: `${envName} not mentioned in .env.example files (optional documentation check).`,
        hint: "Add to server/.env.example or root .env.example if the server reads this variable.",
      });
    }
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

  if (contract.rules?.ui?.requireAriaLabelsOnButtons || contract.rules?.ui?.requireTitleOnIconButtons) {
    const buttonRe = /<button\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = buttonRe.exec(html)) !== null) {
      const open = m[0];
      const after = html.slice(m.index + open.length);
      const closeIdx = after.search(/<\/button>/i);
      const inner = closeIdx >= 0 ? after.slice(0, closeIdx) : "";
      const hasVisibleText = /\S/.test(inner.replace(/<[^>]+>/g, " ").trim());
      const hasAria = /\baria-label\s*=/.test(open) || /\baria-labelledby\s*=/.test(open);
      const hasTitle = /\btitle\s*=/.test(open);
      const looksIconOnly = /<svg\b/i.test(inner) && !hasVisibleText;

      if (contract.rules.ui.requireAriaLabelsOnButtons && !hasAria && !hasVisibleText) {
        report.inconsistencies.push({
          category: "ui",
          severity: "warn",
          message: "Button without aria-label and without visible text in admin-content.html.",
          hint: "Add aria-label or visible text for screen readers.",
        });
        break;
      }
      if (contract.rules.ui.requireTitleOnIconButtons && looksIconOnly && !hasTitle && !hasAria) {
        report.inconsistencies.push({
          category: "ui",
          severity: "warn",
          message: "Icon-only button missing title and aria-label in admin-content.html.",
          hint: "Add title= or aria-label= on icon buttons.",
        });
        break;
      }
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

  const authInc = verifyAuthLoginErrors(contract);
  if (authInc) report.inconsistencies.push(authInc);

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
      if (r.code !== 0) throw new Error("content validation failed (pnpm --prefix server run validate)");
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
  console.log(`[DGCC] report: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`[DGCC] ok=${report.ok ? "true" : "false"} inconsistencies=${report.inconsistencies.length} fixes=${report.fixes.length}`);

  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error("[DGCC] fatal", e);
  process.exit(3);
});

import express from "express";
import { execFile, execFileSync } from "node:child_process";
import net from "node:net";
import type { WorldTick } from "../core/are/index.js";
import { getSupabaseSummary } from "../config/supabase.js";

const REPO_FULL_NAME = process.env.SOVEREIGN_REPO || "OuroborosCollective/Wasd";
const WORKFLOW_ID = process.env.SOVEREIGN_DEPLOY_WORKFLOW || "vps-docker-deploy.yml";
const CLUSTER_NAME = process.env.SOVEREIGN_CLUSTER || "Alpha";

type TcpTarget = { host: string; port: number; source: string };

function safeGit(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function commitHash(): string {
  return process.env.BUILD_COMMIT_SHA || safeGit(["rev-parse", "--short=12", "HEAD"]);
}

function branchName(): string {
  return process.env.DEPLOY_BRANCH || safeGit(["rev-parse", "--abbrev-ref", "HEAD"], "main");
}

function pm2StartedAt(): number | null {
  const value = Number(process.env.pm_uptime);
  return Number.isFinite(value) ? value : Math.round(Date.now() - process.uptime() * 1000);
}

function positivePort(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null;
}

function resolveSupabaseTcpTarget(): TcpTarget {
  const explicitHost = process.env.SUPABASE_TCP_HOST?.trim();
  const explicitPort = positivePort(process.env.SUPABASE_TCP_PORT || process.env.SUPABASE_LOCAL_PORT);
  if (explicitHost) return { host: explicitHost, port: explicitPort ?? 8000, source: "SUPABASE_TCP_HOST" };

  const rawUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_PROXY_URL || "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname) {
        const inferredPort = positivePort(parsed.port) ?? (parsed.protocol === "https:" ? 443 : 80);
        return { host: parsed.hostname, port: explicitPort ?? inferredPort, source: "SUPABASE_URL" };
      }
    } catch {
      // Fall through to the Docker-network default below.
    }
  }

  return { host: "supabase-kong", port: explicitPort ?? 8000, source: "docker-default" };
}

function requireLaunchKey(req: express.Request): boolean {
  const expected = process.env.SOVEREIGN_LAUNCH_KEY || process.env.ADMIN_DEPLOY_TOKEN || "";
  if (!expected) return false;
  const provided = String(req.headers["x-sovereign-launch-key"] || req.body?.launchKey || "");
  return provided.length > 0 && provided === expected;
}

async function tcpProbe(host: string, port: number, timeoutMs = 850): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function runWorkflow(ref: string, reason: string): Promise<{ status: number; body: unknown }> {
  const args = ["workflow", "run", WORKFLOW_ID, "--repo", REPO_FULL_NAME, "--ref", ref, "-f", `reason=${reason}`];
  return new Promise((resolve) => {
    execFile("gh", args, { cwd: process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ status: 500, body: { ok: false, error: "workflow_run_failed", message: "GitHub CLI must be installed and authenticated on the VPS.", detail: String(stderr || error.message).slice(0, 1600) } });
        return;
      }
      resolve({ status: 202, body: { ok: true, dispatched: true, workflow: WORKFLOW_ID, repo: REPO_FULL_NAME, ref, stdout: String(stdout || "").slice(0, 800) } });
    });
  });
}

async function buildTruth(tick: WorldTick) {
  const gamePort = Number(process.env.PORT || process.env.GAME_PORT || 3001);
  const supabaseTarget = resolveSupabaseTcpTarget();
  const supabaseTcp = await tcpProbe(supabaseTarget.host, supabaseTarget.port);
  const hash = commitHash();
  const areSnapshot = tick.getWorldHashSnapshot?.();
  return {
    ok: true,
    cluster: CLUSTER_NAME,
    commitHash: hash,
    shortCommitHash: hash.slice(0, 12),
    branch: branchName(),
    gamePort,
    nodeEnv: process.env.NODE_ENV || "development",
    pm2: { name: "areloria", id: process.env.pm_id ?? null, uptimeSeconds: Math.round(process.uptime()), startedAt: pm2StartedAt(), pid: process.pid },
    supabase: { ...getSupabaseSummary(), tcpHost: supabaseTarget.host, tcpPort: supabaseTarget.port, tcpSource: supabaseTarget.source, localPort: supabaseTarget.port, localTcpReachable: supabaseTcp, status: supabaseTcp ? "reachable" : "not_reachable" },
    are: { guard: tick.getAREGuardStatus?.() ?? null, worldHash: areSnapshot?.worldHash ?? null, worldTick: areSnapshot?.tick ?? null, replay: tick.getReplayRecorderStats?.() ?? null, oracle: tick.getOracleReport?.() ?? null, autoRepair: tick.getAutoRepairStatus?.() ?? null },
  };
}

export function sovereignDeployRouter(tick: WorldTick) {
  const router = express.Router();
  router.use(express.json({ limit: "16kb" }));

  router.get("/truth", async (_req, res) => {
    res.json(await buildTruth(tick));
  });

  router.post("/launch", async (req, res) => {
    if (!requireLaunchKey(req)) {
      res.status(403).json({ ok: false, error: "launch_key_required", message: "Sovereign Launch Key missing, wrong, or not configured." });
      return;
    }
    const ref = String(req.body?.ref || branchName() || "main").replace(/[^a-zA-Z0-9_./-]/g, "").slice(0, 120) || "main";
    const reason = String(req.body?.reason || "Sovereign Launch Button").slice(0, 160);
    const result = await runWorkflow(ref, reason);
    res.status(result.status).json(result.body);
  });

  return router;
}

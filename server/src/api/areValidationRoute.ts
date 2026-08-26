import express from "express";
import type { WorldTick } from "../core/are/index.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

function extractPortalWorldHash(body: any): string | null {
  const candidate =
    body?.world?.worldHash
    ?? body?.world?.world_hash
    ?? body?.worldHash
    ?? body?.world_hash
    ?? (typeof body?.world === "string" ? body.world : null)
    ?? (typeof body === "string" ? body : null);

  return typeof candidate === "string" && /^[0-9a-f]{64}$/i.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

function readFailureFamilyShell(tick: WorldTick): any | null {
  const shell = (tick as any)?.thinShell;
  if (!shell) return null;
  if (typeof shell.getFailureFamilyStatus !== "function") return null;
  if (typeof shell.getFailureFamilyProbeStatus !== "function") return null;
  return shell;
}

function requestedRunId(body: any): string | null {
  const value = typeof body?.runId === "string" ? body.runId.trim() : "";
  if (!value) return null;
  return /^[a-zA-Z0-9:_-]{1,96}$/.test(value) ? value : null;
}

function failureFamilyReadback(tick: WorldTick, shell: any) {
  const probe = shell.getFailureFamilyProbeStatus();
  const failures = shell.getFailureFamilyStatus();
  const runId = typeof probe?.runId === "string" && probe.runId.trim() ? probe.runId.trim() : null;
  const records = Array.isArray(failures?.records) ? failures.records : [];
  const runRecords = runId
    ? records.filter((record: any) => record?.runId === runId || record?.lastRunId === runId)
    : [];
  return {
    tick: Number((tick as any).tickCount ?? 0),
    probe,
    failures,
    runRecords,
  };
}

function runIdAlreadyObserved(shell: any, runId: string): boolean {
  const failures = shell.getFailureFamilyStatus?.();
  const records = Array.isArray(failures?.records) ? failures.records : [];
  return records.some((record: any) => record?.runId === runId || record?.lastRunId === runId);
}

export function areValidationRouter(tick: WorldTick) {
  const router = express.Router();
  router.use(adminRateLimiter, adminAuthMiddleware);

  router.get("/status", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const guard = tick.getAREGuardStatus?.() ?? null;
    if (!guard) {
      res.status(503).json({
        ok: false,
        status: "unavailable",
        guard: null,
        error: "are_guard_unavailable",
      });
      return;
    }

    const ok = guard.ok === true && (guard as any).available !== false;
    res.status(ok ? 200 : 409).json({
      ok,
      status: ok ? "valid" : "violation",
      guard,
    });
  });

  router.get("/world-hash", adminRateLimiter, adminAuthMiddleware, (_req, res) => {
    const world = tick.getWorldHashSnapshot?.() ?? null;
    if (!world) {
      res.status(503).json({ ok: false, error: "world_hash_snapshot_not_ready" });
      return;
    }
    res.status(200).json({ ok: true, world });
  });

  router.get("/failure-families/status", (_req, res) => {
    const shell = readFailureFamilyShell(tick);
    if (!shell) {
      res.status(503).json({ ok: false, error: "failure_family_runtime_unavailable" });
      return;
    }
    res.status(200).json({ ok: true, ...failureFamilyReadback(tick, shell) });
  });

  router.post("/failure-families/run", express.json({ limit: "16kb" }), (req, res) => {
    const shell = readFailureFamilyShell(tick);
    if (!shell || typeof shell.armFailureFamilyRun !== "function") {
      res.status(503).json({ ok: false, error: "failure_family_runtime_unavailable" });
      return;
    }
    const requested = requestedRunId(req.body);
    if (req.body?.runId !== undefined && requested === null) {
      res.status(400).json({ ok: false, error: "invalid_failure_family_run_id" });
      return;
    }
    const before = shell.getFailureFamilyProbeStatus();
    if (before.active) {
      res.status(409).json({
        ok: false,
        error: "failure_family_run_already_active",
        ...failureFamilyReadback(tick, shell),
      });
      return;
    }
    if (requested && runIdAlreadyObserved(shell, requested)) {
      res.status(409).json({
        ok: false,
        error: "failure_family_run_id_already_used",
        requestedRunId: requested,
        ...failureFamilyReadback(tick, shell),
      });
      return;
    }
    shell.armFailureFamilyRun(requested);
    res.status(202).json({
      ok: true,
      accepted: true,
      execution: "next_10hz_tick_slots",
      gameplayMutation: false,
      rerunPolicy: "probe_only_safe_same_context_once",
      ...failureFamilyReadback(tick, shell),
    });
  });

  router.post("/compare", adminRateLimiter, adminAuthMiddleware, express.json({ limit: "1mb" }), (req, res) => {
    const portalHash = extractPortalWorldHash(req.body);
    if (!portalHash) {
      res.status(400).json({
        ok: false,
        error: "invalid_world_hash",
        comparison: null,
        server: tick.getWorldHashSnapshot?.() ?? null,
        guard: tick.getAREGuardStatus?.() ?? null,
      });
      return;
    }

    const server = tick.getWorldHashSnapshot?.() ?? null;
    if (!server) {
      res.status(503).json({
        ok: false,
        error: "world_hash_snapshot_not_ready",
        comparison: null,
        server: null,
        guard: tick.getAREGuardStatus?.() ?? null,
      });
      return;
    }

    const comparison = tick.comparePortalWorldHash?.(portalHash) ?? null;
    const matches = comparison?.matches === true && comparison?.ok === true;
    res.status(matches ? 200 : 409).json({
      ok: matches,
      ...(matches ? {} : { error: "world_hash_mismatch" }),
      comparison,
      server,
      guard: tick.getAREGuardStatus?.() ?? null,
    });
  });

  return router;
}

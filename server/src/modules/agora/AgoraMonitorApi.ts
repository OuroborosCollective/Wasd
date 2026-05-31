import express from "express";
import type { AgoraFinanceSummary, AgoraOAuthConfigStatus, AgoraLiveStatus } from "./AgoraTypes.js";
import { getLastGitHubWebhookEvent } from "./GitHubWebhook.js";

type AgoraMonitorDeps = {
  getTick?: () => any;
  isInitializing?: () => boolean;
  getPort?: () => number;
};

function envConfigured(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

export function getAgoraOAuthConfigStatus(): AgoraOAuthConfigStatus {
  return {
    clientIdConfigured: envConfigured("OPEN_COLLECTIVE_CLIENT_ID"),
    clientSecretConfigured: envConfigured("OPEN_COLLECTIVE_CLIENT_SECRET"),
    callbackConfigured: envConfigured("OPEN_COLLECTIVE_CALLBACK_URL"),
    collectiveSlug: process.env.OPEN_COLLECTIVE_SLUG || "ouroboros-collective-are",
    projectSlug: process.env.OPEN_COLLECTIVE_PROJECT_SLUG || "agora-project",
  };
}

function safeValue<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function createAgoraMonitorRouter(deps: AgoraMonitorDeps = {}): Router {
  const router = express.Router();

  router.get("/config", (_req, res) => {
    const config = getAgoraOAuthConfigStatus();
    res.json({
      clientIdConfigured: config.clientIdConfigured,
      callbackConfigured: config.callbackConfigured,
      collectiveSlug: config.collectiveSlug,
      projectSlug: config.projectSlug,
    });
  });

  router.get("/finance", (_req, res) => {
    const config = getAgoraOAuthConfigStatus();
    const body: AgoraFinanceSummary = {
      configured: config.clientIdConfigured && config.clientSecretConfigured,
      collectiveSlug: config.collectiveSlug,
      projectSlug: config.projectSlug,
      note: "Safe placeholder. Real Open Collective finance sync can be added later through a server-side GraphQL/API integration.",
    };
    res.json(body);
  });

  router.get("/live", (_req, res) => {
    const tick = deps.getTick?.();
    const initializing = Boolean(deps.isInitializing?.());
    const body: AgoraLiveStatus & { github: { lastEvent: ReturnType<typeof getLastGitHubWebhookEvent> } } = {
      ok: !initializing,
      status: initializing ? "initializing" : "ok",
      project: "ARELORIAN MMORPG",
      monitor: "Ouroboros Agora Live Monitor",
      uptimeSeconds: Math.round(process.uptime()),
      port: deps.getPort?.() ?? Number(process.env.PORT || 3000),
      buildHash: process.env.BUILD_COMMIT_SHA || "dev",
      nodeEnv: process.env.NODE_ENV || "development",
      openCollective: getAgoraOAuthConfigStatus(),
      github: {
        lastEvent: getLastGitHubWebhookEvent(),
      },
      persistence: safeValue(() => tick?.getPersistenceStats?.() ?? { status: "unknown" }, { status: "unknown" }),
      are: {
        guard: safeValue(() => tick?.getAREGuardStatus?.() ?? null, null),
        worldHash: safeValue(() => tick?.getWorldHashSnapshot?.()?.worldHash ?? null, null),
        replay: safeValue(() => tick?.getReplayRecorderStats?.() ?? null, null),
      },
      warfront: safeValue(() => tick?.warfrontSystem?.getCycleSnapshot?.() ?? null, null),
    };
    res.status(initializing ? 503 : 200).json(body);
  });

  return router;
}

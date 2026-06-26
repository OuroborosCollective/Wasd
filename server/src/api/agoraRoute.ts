import express from "express";
import { createAgoraMonitorRouter } from "../modules/agora/AgoraMonitorApi.js";
import { createOpenCollectiveAuthRouter } from "../modules/agora/OpenCollectiveAuth.js";
import { createGitHubWebhookRouter } from "../modules/agora/GitHubWebhook.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

type AgoraRouteDeps = {
  getTick?: () => any;
  isInitializing?: () => boolean;
  getPort?: () => number;
};

export function agoraRouter(deps: AgoraRouteDeps = {}) {
  const router = express.Router();

  router.use("/auth/opencollective", createOpenCollectiveAuthRouter());
  router.use("/webhooks", createGitHubWebhookRouter());

  // SECURE: Apply rate limiting and admin authentication to the monitor API
  // This prevents unauthorized access to sensitive system and world state information.
  router.use("/api", adminRateLimiter, adminAuthMiddleware, createAgoraMonitorRouter(deps));

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      monitor: "Ouroboros Agora Live Monitor",
      routes: [
        "/agora/api/live",
        "/agora/api/finance",
        "/agora/api/config",
        "/agora/auth/opencollective/login",
        "/agora/webhooks/github",
      ],
    });
  });

  return router;
}

import express from "express";
import { createAgoraMonitorRouter } from "../modules/agora/AgoraMonitorApi.js";
import { createOpenCollectiveAuthRouter } from "../modules/agora/OpenCollectiveAuth.js";
import { createGitHubWebhookRouter } from "../modules/agora/GitHubWebhook.js";

type AgoraRouteDeps = {
  getTick?: () => any;
  isInitializing?: () => boolean;
  getPort?: () => number;
};

export function agoraRouter(deps: AgoraRouteDeps = {}): express.Router {
  const router = express.Router();

  router.use("/auth/opencollective", createOpenCollectiveAuthRouter());
  router.use("/webhooks", createGitHubWebhookRouter());
  router.use("/api", createAgoraMonitorRouter(deps));

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

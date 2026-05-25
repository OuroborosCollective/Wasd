import express from "express";
import { createAgoraMonitorRouter } from "../modules/agora/AgoraMonitorApi.js";
import { createOpenCollectiveAuthRouter } from "../modules/agora/OpenCollectiveAuth.js";

type AgoraRouteDeps = {
  getTick?: () => any;
  isInitializing?: () => boolean;
  getPort?: () => number;
};

export function agoraRouter(deps: AgoraRouteDeps = {}) {
  const router = express.Router();

  router.use("/auth/opencollective", createOpenCollectiveAuthRouter());
  router.use("/api", createAgoraMonitorRouter(deps));

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      monitor: "Ouroboros Agora Live Monitor",
      routes: ["/agora/api/live", "/agora/api/finance", "/agora/api/config", "/agora/auth/opencollective/login"],
    });
  });

  return router;
}

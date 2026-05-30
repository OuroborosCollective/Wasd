import express from "express";
import { Router } from "express";
import { createSovereignIdentity } from "../collective/SovereignIdentity.js";
import { collectiveIngressRuntime } from "../collective/CollectiveIngressRuntime.js";

export function collectiveIngressRouter(_tick?: unknown): express.Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.json(collectiveIngressRuntime.getStatus());
  });

  router.post("/preview", (req, res) => {
    try {
      const identity = createSovereignIdentity(req.body?.publicKey ?? req.body?.wallet ?? req.body?.hash, req.body?.alias);
      res.json({ ok: true, identity });
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "invalid_identity" });
    }
  });

  return router;
}

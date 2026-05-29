import { Router } from "express";

export function oracleRoute(): Router {
  const router = Router();
  router.get("/api/oracle/vision", (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

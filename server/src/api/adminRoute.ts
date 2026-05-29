import { Router } from "express";

export function adminRoute(): Router {
  const router = Router();
  router.post("/api/admin/command", (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

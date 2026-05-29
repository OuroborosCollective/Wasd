import { Router } from "express";

export function chatRoute(): Router {
  const router = Router();
  router.post("/api/chat/send", (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

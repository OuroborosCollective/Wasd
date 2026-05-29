import { Router } from "express";

export function mailRoute(): Router {
  const router = Router();
  router.post("/api/mail/send", (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

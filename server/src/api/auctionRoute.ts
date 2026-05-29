import { Router } from "express";

export function auctionRoute(): Router {
  const router = Router();
  router.post("/api/auction/list", (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

import { Router } from "express";

export function healthRoute(): Router {
  const router = Router();
  router.get("/", (req, res) => {
    res.json({
      ok: true,
      service: "areloria-server",
      timestamp: Date.now()
    });
  });
  return router;
}

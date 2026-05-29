import { Router } from "express";

export function playerRoutes(): Router {
  const router = Router();
  router.get("/players", (req, res) => {
    res.json({ status: "player routes placeholder" });
  });
  return router;
}

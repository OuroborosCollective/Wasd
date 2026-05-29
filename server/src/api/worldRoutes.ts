import { Router } from "express";

export function worldRoutes(): Router {
  const router = Router();
  router.get("/world", (req, res) => {
    res.json({ status: "world routes placeholder" });
  });
  return router;
}

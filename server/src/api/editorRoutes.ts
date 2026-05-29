import { Router } from "express";

export function editorRoutes(): Router {
  const router = Router();
  router.post("/editor", (req, res) => {
    res.json({ status: "editor routes placeholder" });
  });
  return router;
}

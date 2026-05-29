import express from "express";

export function createOpenCollectiveAuthRouter(): express.Router {
  const router = express.Router();

  router.get("/login", (_req, res) => {
    return res.status(501).json({
      error: "open_collective_oauth_pending",
      message: "Open Collective login route is reserved for server-side OAuth implementation. Configure it on the VPS with private environment variables only.",
    });
  });

  router.get("/callback", (_req, res) => {
    return res.status(501).json({
      error: "open_collective_oauth_pending",
      message: "OAuth callback route is present but token exchange must be enabled server-side without exposing secrets.",
    });
  });

  router.post("/logout", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/me", (_req, res) => {
    res.json({ loggedIn: false, role: "public" });
  });

  return router;
}

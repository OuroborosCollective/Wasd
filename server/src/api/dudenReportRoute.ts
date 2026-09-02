import express from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { adminRateLimiter } from '../middleware/rateLimitMiddleware.js';

function safeLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 80;
  return Math.min(250, n);
}

export function dudenReportRouter() {
  const router = express.Router();
  router.get('/', adminRateLimiter, adminAuthMiddleware, async (req, res) => {
    try {
      const limit = safeLimit(req.query.limit);
      const module = await import('../core/language/LanguageShadowTelemetry.js');
      res.json(module.getLanguageShadowTelemetry(limit));
    } catch {
      res.status(500).json({ ok: false });
    }
  });
  return router;
}

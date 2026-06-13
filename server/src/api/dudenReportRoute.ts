import express from 'express';

function safeLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 80;
  return Math.min(250, n);
}

export function dudenReportRouter() {
  const router = express.Router();
  router.get('/', async (req, res) => {
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

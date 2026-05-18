import { Router, type Request, type Response } from 'express';
import type { WorldTick } from '../core/WorldTick.js';

export type HealthRouteOptions = {
  getTick: () => WorldTick | undefined;
  isInitializing: () => boolean;
  getPort: () => number;
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

export function healthRoutes(options: HealthRouteOptions): Router {
  const router = Router();

  router.get('/live', (_req: Request, res: Response) => {
    noStore(res);
    res.status(200).json({ ok: true, status: 'live', uptimeSeconds: Math.round(process.uptime()), port: options.getPort() });
  });

  router.get('/ready', (_req: Request, res: Response) => {
    noStore(res);
    const initializing = options.isInitializing();
    const tick = options.getTick();
    res.status(initializing ? 503 : 200).json({
      ok: !initializing,
      status: initializing ? 'initializing' : 'ready',
      tickReady: Boolean(tick),
      uptimeSeconds: Math.round(process.uptime()),
      port: options.getPort(),
    });
  });

  router.get('/determinism', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const guard = safe(() => tick?.getAREGuardStatus?.() ?? null, null);
    const replay = safe(() => tick?.getReplayRecorderStats?.() ?? null, null);
    const ok = Boolean(tick) && !options.isInitializing();
    res.status(ok ? 200 : 503).json({ ok, status: ok ? 'deterministic' : 'unready', guard, replay });
  });

  router.get('/worldhash', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const snapshot = safe(() => tick?.getWorldHashSnapshot?.() ?? null, null);
    const ok = Boolean(snapshot);
    res.status(ok ? 200 : 503).json({ ok, status: ok ? 'hashed' : 'unavailable', snapshot });
  });

  return router;
}

import { Router, type Request, type Response } from 'express';
import type { WorldTick } from '../core/WorldTick.js';
import { getDeterministicWatchdogStatus } from '../core/installDeterministicWatchdog.js';
import { checkQuestPersistenceWritable } from './questPersistenceHealth.js';
import { checkSkillPersistenceWritable } from './skillPersistenceHealth.js';

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
    const watchdog = safe(() => (tick as any)?.getWatchdogLedgerStatus?.() ?? getDeterministicWatchdogStatus(), getDeterministicWatchdogStatus());
    res.status(initializing ? 503 : 200).json({
      ok: !initializing,
      status: initializing ? 'initializing' : 'ready',
      tickReady: Boolean(tick),
      uptimeSeconds: Math.round(process.uptime()),
      port: options.getPort(),
      watchdog,
    });
  });

  router.get('/determinism', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const guard = safe(() => tick?.getAREGuardStatus?.() ?? null, null);
    const replay = safe(() => tick?.getReplayRecorderStats?.() ?? null, null);
    const watchdog = safe(() => (tick as any)?.getWatchdogLedgerStatus?.() ?? getDeterministicWatchdogStatus(), getDeterministicWatchdogStatus());
    const ok = Boolean(tick) && !options.isInitializing();
    res.status(ok ? 200 : 503).json({ ok, status: ok ? 'deterministic' : 'unready', guard, replay, watchdog });
  });

  router.get('/watchdog', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const watchdog = safe(() => (tick as any)?.getWatchdogLedgerStatus?.() ?? getDeterministicWatchdogStatus(), getDeterministicWatchdogStatus());
    const ok = Boolean(watchdog?.installed);
    res.status(ok ? 200 : 503).json({ ok, status: ok ? 'watchdog' : 'unavailable', watchdog });
  });

  router.get('/worldhash', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const snapshot = safe(() => tick?.getWorldHashSnapshot?.() ?? null, null);
    const ok = Boolean(snapshot);
    res.status(ok ? 200 : 503).json({ ok, status: ok ? 'hashed' : 'unavailable', snapshot });
  });

  router.get('/quest-persistence', async (_req: Request, res: Response) => {
    noStore(res);
    const result = await checkQuestPersistenceWritable();
    res.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      persistence: result,
    });
  });

  router.get('/skill-persistence', async (_req: Request, res: Response) => {
    noStore(res);
    const result = await checkSkillPersistenceWritable();
    res.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      persistence: result,
    });
  });

  return router;
}

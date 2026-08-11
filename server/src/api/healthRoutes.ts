import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import type { WorldTick } from '../core/are/index.js';
import { getDeterministicWatchdogStatus } from '../core/installDeterministicWatchdog.js';
import { checkQuestPersistenceWritable } from './questPersistenceHealth.js';
import { checkSkillPersistenceWritable } from './skillPersistenceHealth.js';
import { checkInventoryPersistenceWritable } from './inventoryPersistenceHealth.js';
import { buildClientEntrypointHealth } from '../core/ClientEntrypointHealth.js';
import { getActiveGameWebSocketServer } from '../networking/WebSocketServer.js';
import { getSafePlaytesterConfigForLogs } from '../config/PlaytesterConfig.js';

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

function resolveClientRoot(): string {
  const fromEnv = process.env.CLIENT_ROOT_DIR?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  return path.resolve(process.cwd(), 'client');
}

function flattenPersistenceFailures(results: ReadonlyArray<{ name: string; result: any }>): readonly string[] {
  return Object.freeze(
    results
      .filter((entry) => !entry.result?.ok)
      .map((entry) => entry.name)
      .sort(),
  );
}

function countUnavailableEntrypoints(available: Record<string, boolean>): readonly string[] {
  return Object.freeze(
    Object.entries(available)
      .filter(([, ok]) => !ok)
      .map(([name]) => name)
      .sort(),
  );
}

function isCanonicalNonZeroHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value) && !/^0{64}$/i.test(value);
}

export function isUsableWorldHashSnapshot(snapshot: any): boolean {
  return Boolean(
    snapshot
    && isCanonicalNonZeroHash(snapshot.worldHash)
    && Number.isInteger(Number(snapshot.chunkCount))
    && Number(snapshot.chunkCount) > 0,
  );
}

export function isUsableGuardEvidence(guard: any): boolean {
  return Boolean(guard && guard.ok === true && guard.available !== false);
}

export function isUsableReplayEvidence(replay: any): boolean {
  return Boolean(
    replay
    && replay.available !== false
    && Number.isInteger(Number(replay.recordedTicks))
    && Number(replay.recordedTicks) > 0
    && Number.isInteger(Number(replay.replayBufferSize))
    && Number(replay.replayBufferSize) > 0,
  );
}

function buildManifestStatus(tick: WorldTick | undefined): Record<string, unknown> {
  return safe(() => {
    const manager = tick?.getManifestManager?.();
    if (!manager) return { status: 'unavailable' };

    const lastStateHash = manager.getLastStateHash();
    const hashReady = isCanonicalNonZeroHash(lastStateHash);
    return {
      status: hashReady ? 'available' : 'uninitialized',
      lastStateHash: hashReady ? lastStateHash : null,
      lastSnapshotTick: manager.getLastSnapshotTick(),
      highestTick: manager.getReplayGuard().getHighestTick(),
      replayGuardNonces: manager.getReplayGuard().getNonceCount(),
      divergenceCheck: typeof tick?.handleClientDivergence === 'function' ? 'available' : 'unavailable',
    };
  }, { status: 'unavailable' });
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

  router.get('/client-entrypoints', (_req: Request, res: Response) => {
    noStore(res);
    const clientRoot = resolveClientRoot();
    const clientDistPath = path.join(clientRoot, 'dist');
    res.status(200).json({
      ok: true,
      clientEntrypoints: buildClientEntrypointHealth({
        clientRoot,
        clientDistPath,
      }),
    });
  });

  router.get('/determinism', (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const initializing = options.isInitializing();
    const guard = safe(() => tick?.getAREGuardStatus?.() ?? null, null);
    const replay = safe(() => tick?.getReplayRecorderStats?.() ?? null, null);
    const watchdog = safe(() => (tick as any)?.getWatchdogLedgerStatus?.() ?? getDeterministicWatchdogStatus(), getDeterministicWatchdogStatus());

    const tickReady = Boolean(tick) && !initializing;
    const guardReady = isUsableGuardEvidence(guard);
    const replayReady = isUsableReplayEvidence(replay);
    const ok = tickReady && guardReady && replayReady;

    let status = 'unavailable';
    if (initializing) status = 'initializing';
    else if (!tick) status = 'unavailable';
    else if (guard?.ok === false && guard?.available !== false) status = 'degraded';
    else if (ok) status = 'deterministic';

    res.status(ok ? 200 : 503).json({
      ok,
      status,
      evidence: {
        tickReady,
        guardReady,
        replayReady,
      },
      guard,
      replay,
      watchdog,
    });
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
    const ok = isUsableWorldHashSnapshot(snapshot);
    const zeroOrEmpty = Boolean(snapshot && (!isCanonicalNonZeroHash(snapshot.worldHash) || Number(snapshot.chunkCount) <= 0));
    res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? 'hashed' : zeroOrEmpty ? 'uninitialized' : 'unavailable',
      snapshot: ok ? snapshot : null,
    });
  });

  router.get('/observability', async (_req: Request, res: Response) => {
    noStore(res);
    const tick = options.getTick();
    const clientRoot = resolveClientRoot();
    const clientDistPath = path.join(clientRoot, 'dist');
    const clientEntrypoints = buildClientEntrypointHealth({ clientRoot, clientDistPath });
    const persistenceChecks = await Promise.all([
      checkQuestPersistenceWritable().then((result) => ({ name: 'quest', result })),
      checkSkillPersistenceWritable().then((result) => ({ name: 'skill', result })),
      checkInventoryPersistenceWritable().then((result) => ({ name: 'inventory', result })),
    ]);
    const assetAuditFailures = countUnavailableEntrypoints(clientEntrypoints.available);
    const persistenceFailures = flattenPersistenceFailures(persistenceChecks);
    const wsServer = getActiveGameWebSocketServer();
    const wsLoad = wsServer?.getRuntimeStats?.() ?? {
      activeClients: 0,
      trackedPlayerUids: 0,
      playerUidMessagesInWindow: 0,
      totalConnections: 0,
      totalDisconnects: 0,
      totalMessages: 0,
      droppedOversizeMessages: 0,
      droppedRateLimitedMessages: 0,
      invalidMessages: 0,
    };
    const playtesterConfig = getSafePlaytesterConfigForLogs();
    const ok = !options.isInitializing() && Boolean(tick) && persistenceFailures.length === 0 && assetAuditFailures.length === 0;

    res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? 'observable' : 'degraded',
      tick: {
        current: safe(() => tick?.tickCount ?? null, null),
        durationMs: 100,
        rateHz: 10,
        spatial: safe(() => tick?.getSpatialBroadcastStats?.() ?? null, null),
        worldHash: safe(() => tick?.getWorldHashSnapshot?.() ?? null, null),
        replay: safe(() => tick?.getReplayRecorderStats?.() ?? null, null),
      },
      websocket: wsLoad,
      manifest: buildManifestStatus(tick),
      persistence: {
        failures: persistenceFailures,
        checks: Object.fromEntries(persistenceChecks.map((entry) => [entry.name, entry.result])),
      },
      assets: {
        failures: assetAuditFailures,
        clientEntrypoints,
      },
      playtester: {
        enabled: playtesterConfig.enabled,
        streamEnabled: playtesterConfig.streamEnabled,
        monitorMode: playtesterConfig.monitorMode,
        monitorPath: playtesterConfig.monitorPath,
        monitorSignalPath: playtesterConfig.monitorSignalPath,
        monitorPublisherPath: playtesterConfig.monitorPublisherPath,
        persistentNpcEnabled: playtesterConfig.persistentNpcEnabled,
        persona: playtesterConfig.persona,
      },
    });
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

  router.get('/inventory-persistence', async (_req: Request, res: Response) => {
    noStore(res);
    const result = await checkInventoryPersistenceWritable();
    res.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      persistence: result,
    });
  });

  return router;
}

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  healthRoutes,
  isUsableGuardEvidence,
  isUsableReplayEvidence,
  isUsableWorldHashSnapshot,
} from '../api/healthRoutes.js';
import { areReplayRouter } from '../api/areReplayRoute.js';
import { areValidationRouter } from '../api/areValidationRoute.js';

const ADMIN_TOKEN = 'are-truth-test-token';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const originalAdminPanelToken = process.env.ADMIN_PANEL_TOKEN;

function withAdmin(req: request.Test): request.Test {
  return req.set('Authorization', `Bearer ${ADMIN_TOKEN}`);
}

function createHealthApp(tick: any, initializing = false) {
  const app = express();
  app.use('/health', healthRoutes({
    getTick: () => tick,
    isInitializing: () => initializing,
    getPort: () => 3000,
  }));
  return app;
}

function createReplayApp(tick: any) {
  const app = express();
  app.use('/api/are/replay', areReplayRouter(tick));
  return app;
}

function createValidationApp(tick: any) {
  const app = express();
  app.use('/api/are/validation', areValidationRouter(tick));
  return app;
}

beforeEach(() => {
  process.env.ADMIN_PANEL_TOKEN = ADMIN_TOKEN;
});

afterEach(() => {
  if (originalAdminPanelToken === undefined) delete process.env.ADMIN_PANEL_TOKEN;
  else process.env.ADMIN_PANEL_TOKEN = originalAdminPanelToken;
});

describe('ARE evidence readiness policy', () => {
  it('does not treat missing, zero, or explicitly unavailable evidence as usable', () => {
    expect(isUsableGuardEvidence(null)).toBe(false);
    expect(isUsableGuardEvidence({ ok: true, available: false })).toBe(false);
    expect(isUsableReplayEvidence({ available: false, recordedTicks: 10, replayBufferSize: 10 })).toBe(false);
    expect(isUsableReplayEvidence({ available: true, recordedTicks: 0, replayBufferSize: 0 })).toBe(false);
    expect(isUsableWorldHashSnapshot({ worldHash: '0'.repeat(64), chunkCount: 1 })).toBe(false);
    expect(isUsableWorldHashSnapshot({ worldHash: HASH_A, chunkCount: 0 })).toBe(false);
  });

  it('accepts structurally complete evidence for route-contract evaluation only', () => {
    // Contract-unit test only: these values are not runtime Green evidence.
    expect(isUsableGuardEvidence({ ok: true, invariant: 'test' })).toBe(true);
    expect(isUsableReplayEvidence({ available: true, recordedTicks: 1, replayBufferSize: 1 })).toBe(true);
    expect(isUsableWorldHashSnapshot({ worldHash: HASH_A, chunkCount: 1 })).toBe(true);
  });
});

describe('healthRoutes fail closed', () => {
  it('returns 503 when guard and replay evidence are unavailable', async () => {
    const app = createHealthApp({
      getAREGuardStatus: () => null,
      getReplayRecorderStats: () => ({
        available: false,
        recordedTicks: 0,
        replayBufferSize: 0,
        reason: 'no recorder',
      }),
      getWorldHashSnapshot: () => null,
    });

    const determinism = await request(app).get('/health/determinism').expect(503);
    expect(determinism.body.ok).toBe(false);
    expect(determinism.body.status).toBe('unavailable');
    expect(determinism.body.evidence).toEqual({
      tickReady: true,
      guardReady: false,
      replayReady: false,
    });

    const worldHash = await request(app).get('/health/worldhash').expect(503);
    expect(worldHash.body.ok).toBe(false);
    expect(worldHash.body.status).toBe('unavailable');
    expect(worldHash.body.snapshot).toBeNull();
  });

  it('returns 503 uninitialized for a zero or empty world hash', async () => {
    const app = createHealthApp({
      getAREGuardStatus: () => ({ ok: true, invariant: 'test' }),
      getReplayRecorderStats: () => ({ available: true, recordedTicks: 1, replayBufferSize: 1 }),
      getWorldHashSnapshot: () => ({
        tick: 1,
        worldHash: '0'.repeat(64),
        chunkCount: 0,
        entityCount: 0,
        timestamp: 1,
      }),
    });

    const response = await request(app).get('/health/worldhash').expect(503);
    expect(response.body).toMatchObject({ ok: false, status: 'uninitialized', snapshot: null });
  });
});

describe('ARE replay route fail closed', () => {
  it('returns 503 when no canonical replay recorder exists', async () => {
    const tick = {
      tickCount: 0,
      worldState: {},
      getReplayRecorderStats: () => ({
        available: false,
        recordedTicks: 0,
        replayBufferSize: 0,
        reason: 'no recorder',
      }),
      getReplaySnapshot: () => null,
      getAutoRepairStatus: () => ({ ok: false, status: 'unavailable' }),
      getDeterministicUsageStats: () => ({ hashesInWindow: 0 }),
    };
    const app = createReplayApp(tick);

    const stats = await withAdmin(request(app).get('/api/are/replay/stats')).expect(503);
    expect(stats.body.ok).toBe(false);
    expect(stats.body.status).toBe('unavailable');

    const snapshot = await withAdmin(request(app).get('/api/are/replay/snapshot/1')).expect(503);
    expect(snapshot.body.error).toBe('replay_unavailable');
  });

  it('returns 404 instead of success when a recorder returns snapshot:null', async () => {
    const tick = {
      tickCount: 5,
      worldState: {},
      getReplayRecorderStats: () => ({ available: true, recordedTicks: 5, replayBufferSize: 5 }),
      getReplaySnapshot: (tickId: number) => ({ tick: tickId, snapshot: null }),
      getAutoRepairStatus: () => ({ ok: false, status: 'unavailable' }),
      getDeterministicUsageStats: () => ({ hashesInWindow: 5 }),
    };
    const app = createReplayApp(tick);

    const response = await withAdmin(request(app).get('/api/are/replay/snapshot/3')).expect(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('replay_tick_not_found');
  });
});

describe('ARE validation route fail closed', () => {
  it('returns 503 when no runtime guard exists', async () => {
    const app = createValidationApp({
      getAREGuardStatus: () => null,
      getWorldHashSnapshot: () => null,
    });

    const response = await withAdmin(request(app).get('/api/are/validation/status')).expect(503);
    expect(response.body).toMatchObject({ ok: false, status: 'unavailable', error: 'are_guard_unavailable' });
  });

  it('returns 409 for a world-hash mismatch and 200 only for a match', async () => {
    const server = {
      tick: 10,
      worldHash: HASH_A,
      chunkCount: 1,
      entityCount: 2,
      timestamp: 10,
    };
    const tick = {
      getAREGuardStatus: () => ({ ok: true, invariant: 'test' }),
      getWorldHashSnapshot: () => server,
      comparePortalWorldHash: (portalHash: string) => {
        const matches = portalHash === HASH_A;
        return {
          ok: matches,
          portalHash,
          worldHash: HASH_A,
          matches,
          ...(matches ? {} : { reason: 'world_hash_mismatch' }),
        };
      },
    };
    const app = createValidationApp(tick);

    const mismatch = await withAdmin(
      request(app).post('/api/are/validation/compare').send({ worldHash: HASH_B }),
    ).expect(409);
    expect(mismatch.body.ok).toBe(false);
    expect(mismatch.body.error).toBe('world_hash_mismatch');
    expect(mismatch.body.comparison.matches).toBe(false);

    const match = await withAdmin(
      request(app).post('/api/are/validation/compare').send({ worldHash: HASH_A }),
    ).expect(200);
    expect(match.body.ok).toBe(true);
    expect(match.body.comparison.matches).toBe(true);
  });
});

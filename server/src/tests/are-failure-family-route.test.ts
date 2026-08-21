import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { areValidationRouter } from '../api/areValidationRoute.js';

const ADMIN_TOKEN = 'failure-family-route-token';
const originalAdminPanelToken = process.env.ADMIN_PANEL_TOKEN;

function appFor(tick: any) {
  const app = express();
  app.use('/api/are/validation', areValidationRouter(tick));
  return app;
}

function admin(req: request.Test): request.Test {
  return req.set('Authorization', `Bearer ${ADMIN_TOKEN}`);
}

beforeEach(() => {
  process.env.ADMIN_PANEL_TOKEN = ADMIN_TOKEN;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalAdminPanelToken === undefined) delete process.env.ADMIN_PANEL_TOKEN;
  else process.env.ADMIN_PANEL_TOKEN = originalAdminPanelToken;
});

describe('ARE failure-family validation routes', () => {
  it('fails closed when the 10Hz failure-family runtime is unavailable', async () => {
    const app = appFor({ tickCount: 0 });
    const status = await admin(request(app).get('/api/are/validation/failure-families/status')).expect(503);
    expect(status.body.error).toBe('failure_family_runtime_unavailable');

    const run = await admin(request(app).post('/api/are/validation/failure-families/run').send({})).expect(503);
    expect(run.body.error).toBe('failure_family_runtime_unavailable');
  });

  it('accepts a run only when the probe is idle and reports 10Hz execution semantics', async () => {
    let probe = { active: false, runId: null as string | null, queuedCases: 0 };
    const arm = vi.fn((runId: string | null) => {
      probe = { active: true, runId: runId ?? 'generated-run', queuedCases: 6 };
      return { ...probe, completedCases: 0, totalCases: 6, startedAtTick: null, lastExecutedTick: null };
    });
    const thinShell = {
      getFailureFamilyStatus: () => ({ status: 'clean', totalOccurrences: 0, records: [] }),
      getFailureFamilyProbeStatus: () => probe,
      armFailureFamilyRun: arm,
    };
    const app = appFor({ tickCount: 100, thinShell });

    const response = await admin(
      request(app).post('/api/are/validation/failure-families/run').send({ runId: 'manual-regression' }),
    ).expect(202);

    expect(arm).toHaveBeenCalledWith('manual-regression');
    expect(response.body).toMatchObject({
      ok: true,
      accepted: true,
      execution: 'next_10hz_tick_slots',
      gameplayMutation: false,
      rerunPolicy: 'probe_only_safe_same_context_once',
      tick: 100,
      probe: { active: true, runId: 'manual-regression', queuedCases: 6 },
      runRecords: [],
    });
  });

  it('returns only records associated with the current or most recent run id', async () => {
    const thinShell = {
      getFailureFamilyProbeStatus: () => ({ active: false, runId: 'run-two', queuedCases: 0, completedCases: 6 }),
      getFailureFamilyStatus: () => ({
        status: 'clean',
        totalOccurrences: 3,
        records: [
          { fingerprint: 'a', runId: 'run-one', lastRunId: 'run-two', caseId: 'case-a' },
          { fingerprint: 'b', runId: 'run-one', lastRunId: 'run-one', caseId: 'case-b' },
          { fingerprint: 'c', runId: null, lastRunId: null, caseId: null },
        ],
      }),
      armFailureFamilyRun: vi.fn(),
    };
    const app = appFor({ tickCount: 222, thinShell });

    const response = await admin(request(app).get('/api/are/validation/failure-families/status')).expect(200);

    expect(response.body.tick).toBe(222);
    expect(response.body.probe.runId).toBe('run-two');
    expect(response.body.runRecords).toEqual([
      { fingerprint: 'a', runId: 'run-one', lastRunId: 'run-two', caseId: 'case-a' },
    ]);
  });

  it('rejects a reused completed run id before old records can masquerade as fresh evidence', async () => {
    const armFailureFamilyRun = vi.fn();
    const thinShell = {
      getFailureFamilyProbeStatus: () => ({ active: false, runId: 'previous-run', queuedCases: 0, completedCases: 6 }),
      getFailureFamilyStatus: () => ({
        status: 'clean',
        records: [{ fingerprint: 'old', runId: 'previous-run', lastRunId: 'previous-run', caseId: 'case-a' }],
      }),
      armFailureFamilyRun,
    };
    const app = appFor({ tickCount: 300, thinShell });

    const response = await admin(
      request(app).post('/api/are/validation/failure-families/run').send({ runId: 'previous-run' }),
    ).expect(409);

    expect(response.body.error).toBe('failure_family_run_id_already_used');
    expect(response.body.requestedRunId).toBe('previous-run');
    expect(response.body.runRecords).toHaveLength(1);
    expect(armFailureFamilyRun).not.toHaveBeenCalled();
  });

  it('rejects malformed run ids and a second run while one is active', async () => {
    const thinShell = {
      getFailureFamilyStatus: () => ({ status: 'observed', totalOccurrences: 1, records: [] }),
      getFailureFamilyProbeStatus: () => ({ active: true, runId: 'already-running', queuedCases: 4 }),
      armFailureFamilyRun: vi.fn(),
    };
    const app = appFor({ tickCount: 10, thinShell });

    await admin(request(app).post('/api/are/validation/failure-families/run').send({ runId: '../../bad' })).expect(400);

    const active = await admin(
      request(app).post('/api/are/validation/failure-families/run').send({ runId: 'next-run' }),
    ).expect(409);
    expect(active.body.error).toBe('failure_family_run_already_active');
    expect(active.body.runRecords).toEqual([]);
    expect(thinShell.armFailureFamilyRun).not.toHaveBeenCalled();
  });
});

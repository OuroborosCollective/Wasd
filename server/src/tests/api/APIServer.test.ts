import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('../../state/WorldStateRegistry.js', () => ({
  worldStateRegistry: {
    getCurrentState: () => ({
      regions: new Map([
        ['region-1', {
          matrixEnergyBalance: 1000,
          visualCorruptionState: 500,
          stabilityLevel: 'STABLE',
          infrastructureLevel: 2000,
          threatLevel: 100,
          tradeFlowIntensity: 50,
          oraclePressureTags: [],
          resourceSaturation: new Map()
        }]
      ])
    }),
    getTick: () => 100n
  }
}));

vi.mock('../../systems/ArelorianKernel.js', () => ({
  arelorianKernel: {
    getTickRate: () => 10
  }
}));

describe('APIServer Security', () => {
  let app: express.Express;
  let APIServerModule: any;
  const TEST_API_KEY = 'test-api-key-123';

  beforeEach(async () => {
    vi.resetModules();
    process.env.API_KEY = TEST_API_KEY;
    app = express();
    APIServerModule = await import('../../core/api/APIServer.js');
  });

  it('should allow access to health endpoint without API key', async () => {
    const apiServer = new APIServerModule.APIServer();
    apiServer.initialize(app, null);
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('should deny access to world status without API key', async () => {
    const apiServer = new APIServerModule.APIServer();
    apiServer.initialize(app, null);
    const response = await request(app).get('/api/v1/world/status');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should deny access to region details with invalid API key', async () => {
    const apiServer = new APIServerModule.APIServer();
    apiServer.initialize(app, null);
    const response = await request(app)
      .get('/api/v1/regions/region-1')
      .set('x-api-key', 'wrong-key');
    expect(response.status).toBe(401);
  });

  it('should allow access to world status with valid API key', async () => {
    const apiServer = new APIServerModule.APIServer();
    apiServer.initialize(app, null);
    const response = await request(app)
      .get('/api/v1/world/status')
      .set('x-api-key', TEST_API_KEY);

    expect(response.status).toBe(200);
  });
});

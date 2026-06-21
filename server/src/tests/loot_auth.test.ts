import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createLootRoutes } from '../routes/lootRoutes.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

// Mock the dependencies
vi.mock('../bootLootSystem.js', () => ({
  getLootDirector: vi.fn(() => ({
    getStatus: vi.fn(() => ({ status: 'ok' }))
  }))
}));

vi.mock('../middleware/adminAuthMiddleware.js', () => ({
  adminAuthMiddleware: vi.fn((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === 'Bearer valid-token') {
      next();
    } else {
      res.status(401).json({ error: 'Admin token or Supabase Bearer required' });
    }
  })
}));

vi.mock('../middleware/rateLimitMiddleware.js', () => ({
  adminRateLimiter: (req, res, next) => next()
}));

describe('Loot Admin API Security', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mount the loot router with auth middleware as it is in ServerBootstrap.ts
    app.use('/api/admin/loot', adminAuthMiddleware, createLootRoutes());
  });

  it('should return 401 Unauthorized for unauthenticated access to /status', async () => {
    const response = await request(app).get('/api/admin/loot/status');
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('should return 200 OK for authenticated access to /status', async () => {
    const response = await request(app)
      .get('/api/admin/loot/status')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.system).toBe('ARE_INFINITE_LOOT_MACHINE');
  });

  it('should return 401 Unauthorized for unauthenticated access to /generate', async () => {
    const response = await request(app).post('/api/admin/loot/generate').send({});
    expect(response.status).toBe(401);
  });
});

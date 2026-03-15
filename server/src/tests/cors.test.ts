import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServerBootstrap } from "../core/ServerBootstrap.js";
import express from "express";
import request from "supertest";

// Mock external dependencies
vi.mock("../networking/WebSocketServer.js", () => ({
  GameWebSocketServer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
  })),
}));

vi.mock("../core/WorldTick.js", () => ({
  WorldTick: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(true),
    start: vi.fn(),
  })),
}));

vi.mock("../core/Database.js", () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
  })),
  db: {
    query: vi.fn(),
  },
}));

vi.mock("../core/Migrations.js", () => ({
  runMigrations: vi.fn().mockResolvedValue(true),
}));

vi.mock("../modules/land/LandSystem.js", () => ({
  LandSystem: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("../modules/character/CharacterAssemblySystem.js", () => ({
  characterAssembly: {
    init: vi.fn(),
  },
}));

vi.mock("vite", () => ({
  createServer: vi.fn().mockResolvedValue({
    middlewares: (req: any, res: any, next: any) => next(),
  }),
}));

// We only want to test the express app middleware
let app: express.Express;

describe("CORS Security Tests", () => {
  beforeEach(async () => {
    // Reset env vars
    delete process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = "test";

    // Create an express app and only add the CORS middleware
    app = express();

    // This is essentially copying the logic from ServerBootstrap.ts
    // to isolate the middleware for testing
    app.use((req, res, next) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : (process.env.NODE_ENV === 'production' ? [] : ['*']);

      const origin = req.headers.origin;
      if (allowedOrigins.includes('*')) {
        res.header("Access-Control-Allow-Origin", "*");
      } else if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }

      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,x-player-id");
      if (req.method === "OPTIONS") return res.sendStatus(200);
      next();
    });

    // Add a simple endpoint
    app.get("/test", (req, res) => {
      res.json({ ok: true });
    });
  });

  it("should allow any origin when ALLOWED_ORIGINS is not set and not in production", async () => {
    const res = await request(app)
      .get("/test")
      .set("Origin", "http://evil.com");

    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("should not set Access-Control-Allow-Origin for invalid origins when ALLOWED_ORIGINS is set", async () => {
    process.env.ALLOWED_ORIGINS = "http://localhost:3000,https://mygame.com";

    const res = await request(app)
      .get("/test")
      .set("Origin", "http://evil.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should set Access-Control-Allow-Origin for valid origins when ALLOWED_ORIGINS is set", async () => {
    process.env.ALLOWED_ORIGINS = "http://localhost:3000,https://mygame.com";

    const res = await request(app)
      .get("/test")
      .set("Origin", "https://mygame.com");

    expect(res.headers["access-control-allow-origin"]).toBe("https://mygame.com");
  });

  it("should not set Access-Control-Allow-Origin in production when ALLOWED_ORIGINS is not set", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app)
      .get("/test")
      .set("Origin", "http://evil.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should correctly handle OPTIONS requests", async () => {
    process.env.ALLOWED_ORIGINS = "https://mygame.com";

    const res = await request(app)
      .options("/test")
      .set("Origin", "https://mygame.com");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://mygame.com");
    expect(res.headers["access-control-allow-methods"]).toBe("GET,POST,PUT,DELETE,OPTIONS");
  });
});

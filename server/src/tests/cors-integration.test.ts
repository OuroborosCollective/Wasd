import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { corsMiddleware } from "../middleware/corsMiddleware.js";

describe("CORS Middleware Integration Tests", () => {
  let app: express.Express;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    app = express();
    app.use(corsMiddleware());
    app.get("/test", (req, res) => {
      res.json({ ok: true });
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should allow any origin in development when no ALLOWED_ORIGINS is set, returning the request origin for credentials", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOWED_ORIGINS;

    const res = await request(app)
      .get("/test")
      .set("Origin", "http://evil.com");

    expect(res.headers["access-control-allow-origin"]).toBe("http://evil.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should deny origins in production when no ALLOWED_ORIGINS is set", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOWED_ORIGINS;

    const res = await request(app)
      .get("/test")
      .set("Origin", "http://evil.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should allow specific origin if set in ALLOWED_ORIGINS", async () => {
    process.env.ALLOWED_ORIGINS = "https://trusted.com,https://another.com";

    const res = await request(app)
      .get("/test")
      .set("Origin", "https://trusted.com");

    expect(res.headers["access-control-allow-origin"]).toBe("https://trusted.com");
  });

  it("should deny untrusted origin if ALLOWED_ORIGINS is set", async () => {
    process.env.ALLOWED_ORIGINS = "https://trusted.com";

    const res = await request(app)
      .get("/test")
      .set("Origin", "https://untrusted.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should allow all origins if * is in ALLOWED_ORIGINS by returning the request origin", async () => {
    process.env.ALLOWED_ORIGINS = "https://trusted.com,*";

    const res = await request(app)
      .get("/test")
      .set("Origin", "https://any-origin.com");

    expect(res.headers["access-control-allow-origin"]).toBe("https://any-origin.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should handle OPTIONS requests correctly", async () => {
    process.env.ALLOWED_ORIGINS = "https://trusted.com";

    const res = await request(app)
      .options("/test")
      .set("Origin", "https://trusted.com");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://trusted.com");
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });
});

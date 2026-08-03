import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authRoute } from "../api/authRoute.js";

describe("authRoute", () => {
  it("returns an object with method POST and path /api/auth/login", () => {
    const route = authRoute();
    expect(route).toEqual({
      method: "POST",
      path: "/api/auth/login",
      handler: expect.any(Function)
    });
  });

  it("handles potential future try-catch scenarios by not throwing errors", () => {
    expect(() => authRoute()).not.toThrow();
  });

  describe("production JWT secret enforcement", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      vi.restoreAllMocks();
    });

    it("throws/forwards an error in production when no JWT_SECRET is configured", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;

      const route = authRoute();
      const mockReq = {
        headers: {},
        body: { username: "testuser", password: "password123" }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();

      route.handler(mockReq as any, mockRes as any, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toContain("FATAL: JWT_SECRET is not set in production environment.");
    });

    it("succeeds in production when JWT_SECRET is configured", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "production_secret_key";

      const route = authRoute();
      const mockReq = {
        headers: {},
        body: { username: "testuser", password: "password123" }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      await route.handler(mockReq as any, mockRes as any, () => {});

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: "auth",
          data: expect.objectContaining({
            tokenType: "Bearer"
          })
        })
      );
    });

    it("falls back to DEV_SECRET in development environment", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_SECRET;

      const route = authRoute();
      const mockReq = {
        headers: {},
        body: { username: "testuser", password: "password123" }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      await route.handler(mockReq as any, mockRes as any, () => {});

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: "auth",
          data: expect.objectContaining({
            tokenType: "Bearer"
          })
        })
      );
    });
  });
});

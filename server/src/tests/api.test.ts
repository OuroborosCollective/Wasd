import { describe, it, expect, vi } from "vitest";
import { authRoute } from "../api/authRoute.js";
import { playerRoutes } from "../api/playerRoutes.js";

describe("API Route Configurations", () => {
  describe("authRoute", () => {
    it("returns correct configuration for login", () => {
      const config = authRoute();
      expect(config.method).toBe("POST");
      expect(config.path).toBe("/api/auth/login");
    });
  });

  describe("playerRoutes", () => {
    it("returns correct configuration", () => {
      const config = playerRoutes();
      expect(config.method).toBe("GET");
      expect(config.path).toBe("/players");
    });

    it("handler calls res.json with players envelope", () => {
      const config = playerRoutes();
      const mockReq = {
        headers: {}
      };
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      config.handler(mockReq as any, mockRes as any, () => {});

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: "players"
        })
      );
    });
  });
});

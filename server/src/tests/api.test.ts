import { describe, it, expect } from "vitest";
import { authRoute } from "../api/authRoute.js";

describe("API Route Configurations", () => {
  describe("authRoute", () => {
    it("returns correct configuration for login", () => {
      const config = authRoute();
      expect(config.method).toBe("POST");
      expect(config.path).toBe("/api/auth/login");
    });
  });
});

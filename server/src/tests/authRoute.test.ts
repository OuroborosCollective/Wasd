import { describe, it, expect } from "vitest";
import { authRoute } from "../api/authRoute.js";

describe("authRoute", () => {
  it("returns an object with method POST and path /api/auth/login", () => {
    const route = authRoute();
    expect(route).toEqual({
      method: "POST",
      path: "/api/auth/login"
    });
  });

  it("handles potential future try-catch scenarios by not throwing errors", () => {
    expect(() => authRoute()).not.toThrow();
  });
});

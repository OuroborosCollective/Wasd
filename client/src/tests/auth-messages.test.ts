import { describe, expect, it } from "vitest";
import {
  mapFirebaseAuthError,
  normalizeAuthEmail,
  validateEmailForAuth,
  validatePasswordForLogin,
  validatePasswordForSignup,
} from "../ui/authMessages";

describe("authMessages", () => {
  it("normalizes and validates emails", () => {
    expect(normalizeAuthEmail("  PLAYER@Example.Com ")).toBe("player@example.com");
    expect(validateEmailForAuth(" ")).toBe("Please enter your email address.");
    expect(validateEmailForAuth("not-an-email")).toBe("Please enter a valid email address.");
    expect(validateEmailForAuth("player@example.com")).toBeNull();
  });

  it("validates login and signup passwords", () => {
    expect(validatePasswordForLogin("")).toBe("Please enter your password.");
    expect(validatePasswordForLogin("abc")).toBeNull();
    expect(validatePasswordForSignup("")).toBe("Please enter a password.");
    expect(validatePasswordForSignup("12345")).toBe("Password must be at least 6 characters.");
    expect(validatePasswordForSignup("123456")).toBeNull();
  });

  it("maps known Firebase auth errors to user-friendly text", () => {
    expect(mapFirebaseAuthError({ code: "auth/email-already-in-use" })).toBe(
      "This email is already registered. Try signing in instead."
    );
    expect(mapFirebaseAuthError({ code: "auth/weak-password" })).toBe(
      "Password is too weak. Use at least 6 characters."
    );
  });

  it("falls back to generic text for unknown errors", () => {
    expect(mapFirebaseAuthError({ code: "auth/something-new" })).toBe(
      "Authentication failed. Please try again."
    );
    expect(mapFirebaseAuthError(new Error("custom failure"))).toBe("custom failure");
  });
});

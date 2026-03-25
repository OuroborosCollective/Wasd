import { describe, it, expect, beforeEach } from "vitest";
import { PayloadValidator } from "../modules/security/PayloadValidator.js";

describe("PayloadValidator", () => {
  let validator: PayloadValidator;

  beforeEach(() => {
    validator = new PayloadValidator();
  });

  it("accepts a plain object", () => {
    expect(validator.validateObject({ type: "move", x: 10 })).toBe(true);
  });

  it("accepts an empty object", () => {
    expect(validator.validateObject({})).toBe(true);
  });

  it("rejects null", () => {
    expect(validator.validateObject(null)).toBe(false);
  });

  it("rejects a string", () => {
    expect(validator.validateObject("hello")).toBe(false);
  });

  it("rejects a number", () => {
    expect(validator.validateObject(42)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validator.validateObject(undefined)).toBe(false);
  });

  it("rejects an array", () => {
    expect(validator.validateObject([1, 2, 3])).toBe(false);
  });
});

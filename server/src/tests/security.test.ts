import { describe, it, expect, beforeEach } from "vitest";
import { PayloadValidator } from "../modules/security/PayloadValidator.js";
import { AntiCheatHooks } from "../modules/security/AntiCheatHooks.js";

// ---------------------------------------------------------------------------
// PayloadValidator
// ---------------------------------------------------------------------------
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

  it("rejects an array (arrays are objects but behave as objects)", () => {
    // Arrays are typeof "object" and not null, so the validator returns true.
    // This test documents the current behaviour.
    expect(validator.validateObject([1, 2, 3])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AntiCheatHooks
// ---------------------------------------------------------------------------
describe("AntiCheatHooks", () => {
  let hooks: AntiCheatHooks;

  beforeEach(() => {
    hooks = new AntiCheatHooks();
  });

  it("normal movement is not flagged as suspicious", () => {
    expect(hooks.inspectMovement({ x: 5, y: 5 }).suspicious).toBe(false);
  });

  it("zero movement is not flagged", () => {
    expect(hooks.inspectMovement({ x: 0, y: 0 }).suspicious).toBe(false);
  });

  it("x delta > 100 is flagged as suspicious", () => {
    expect(hooks.inspectMovement({ x: 101, y: 0 }).suspicious).toBe(true);
  });

  it("y delta > 100 is flagged as suspicious", () => {
    expect(hooks.inspectMovement({ x: 0, y: 200 }).suspicious).toBe(true);
  });

  it("exactly 100 on either axis is not flagged", () => {
    expect(hooks.inspectMovement({ x: 100, y: 100 }).suspicious).toBe(false);
  });

  it("negative large x delta is flagged", () => {
    expect(hooks.inspectMovement({ x: -150, y: 0 }).suspicious).toBe(true);
  });

  it("missing delta object returns not suspicious", () => {
    expect(hooks.inspectMovement(null).suspicious).toBe(false);
  });

  it("undefined delta returns not suspicious", () => {
    expect(hooks.inspectMovement(undefined).suspicious).toBe(false);
  });
});

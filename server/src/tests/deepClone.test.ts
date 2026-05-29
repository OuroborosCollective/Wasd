import { describe, it, expect } from "vitest";
import { deepClone } from "../utils/deepClone.js";

describe("deepClone (JSON parity mode)", () => {
  it("clones primitives", () => {
    expect(deepClone(1)).toBe(1);
    expect(deepClone("hello")).toBe("hello");
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it("clones simple objects", () => {
    const obj = { a: 1, b: "2", c: true };
    const copy = deepClone(obj);
    expect(copy).toEqual(obj);
    expect(copy).not.toBe(obj);
  });

  it("clones arrays", () => {
    const arr = [1, 2, 3];
    const copy = deepClone(arr);
    expect(copy).toEqual(arr);
    expect(copy).not.toBe(arr);
  });

  it("clones nested structures", () => {
    const obj = {
      a: [1, { b: 2 }],
      c: { d: 3 }
    };
    const copy = deepClone(obj);
    expect(copy).toEqual(obj);
    expect(copy.a).not.toBe(obj.a);
    expect(copy.a[1]).not.toBe(obj.a[1]);
    expect(copy.c).not.toBe(obj.c);
  });

  it("converts Dates to ISO strings (JSON parity)", () => {
    const date = new Date();
    const copy = deepClone(date);
    expect(copy).toBe(date.toISOString());
    expect(typeof copy).toBe("string");
  });

  it("omits functions and undefined from objects (JSON parity)", () => {
    const obj = {
      a: 1,
      b: undefined,
      c: () => {},
      d: Symbol("test")
    };
    const copy = deepClone(obj);
    expect(copy).toEqual({ a: 1 });
    expect("b" in copy).toBe(false);
    expect("c" in copy).toBe(false);
    expect("d" in copy).toBe(false);
  });

  it("converts functions and undefined to null in arrays (JSON parity)", () => {
    const arr = [1, undefined, () => {}, "test"];
    const copy = deepClone(arr);
    expect(copy).toEqual([1, null, null, "test"]);
  });

  it("handles empty objects and arrays", () => {
    expect(deepClone({})).toEqual({});
    expect(deepClone([])).toEqual([]);
  });
});

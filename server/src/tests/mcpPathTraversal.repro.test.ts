import { describe, it, expect } from "vitest";
import path from "path";
// Using relative path for testing purposes in this environment
import { validatePath } from "../api/mcpRoute.js";

describe("MCP Path Traversal Validation", () => {
  it("should allow paths within the project root", () => {
    const validPath = "package.json";
    expect(() => validatePath(validPath)).not.toThrow();
    expect(validatePath(validPath)).toBe(path.resolve(process.cwd(), validPath));
  });

  it("should allow paths in subdirectories", () => {
    const validPath = "server/src/api/mcpRoute.ts";
    expect(() => validatePath(validPath)).not.toThrow();
    expect(validatePath(validPath)).toBe(path.resolve(process.cwd(), validPath));
  });

  it("should block path traversal attempts with ../", () => {
    const invalidPath = "../../../etc/passwd";
    expect(() => validatePath(invalidPath)).toThrow(/Path traversal attempt detected/);
  });

  it("should block absolute paths outside project root", () => {
    const invalidPath = "/etc/passwd";
    if (process.cwd() !== "/") {
        expect(() => validatePath(invalidPath)).toThrow(/Path traversal attempt detected/);
    }
  });

  it("should block sibling directory access", () => {
    // If cwd is /app, path.resolve(cwd, '../app-secrets') is /app-secrets
    // p.startsWith(cwd) would be false, and path.relative(cwd, p) would be '../app-secrets' which starts with '..'
    const siblingPath = "../app-secrets/config.json";
    expect(() => validatePath(siblingPath)).toThrow(/Path traversal attempt detected/);
  });
});

import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentRoot } from "../modules/content/validateContentCore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameData = path.resolve(__dirname, "../../../game-data");

describe("validateContentRoot", () => {
  it("passes on repo game-data", () => {
    const r = validateContentRoot(gameData);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

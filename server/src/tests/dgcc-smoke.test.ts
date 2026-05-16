import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");

describe("DGCC smoke", () => {
  it("parses DGCC contract JSON", () => {
    const p = path.join(repoRoot, "tools/dgcc/dgcc.contract.json");
    expect(fs.existsSync(p)).toBe(true);
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as { modes?: Record<string, unknown> };
    expect(j.modes?.minimal).toBeTruthy();
    expect(j.modes?.extreme).toBeTruthy();
  });

  it("parses DGCC report schema JSON", () => {
    const p = path.join(repoRoot, "tools/dgcc/dgcc.report.schema.json");
    expect(fs.existsSync(p)).toBe(true);
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as { title?: string };
    expect(j.title).toBe("DGCC Report");
  });
});

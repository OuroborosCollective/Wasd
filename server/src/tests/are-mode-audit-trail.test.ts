import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { AREModeAuditTrail } from "../modules/world/AREModeAuditTrail.js";

const TEST_AUDIT_PATH = path.resolve(process.cwd(), "game-data/world/are-mode-audit.test.log");

afterEach(() => {
  if (fs.existsSync(TEST_AUDIT_PATH)) {
    fs.unlinkSync(TEST_AUDIT_PATH);
  }
});

describe("AREModeAuditTrail", () => {
  it("writes mode-change entries and reads them newest-first", () => {
    const trail = new AREModeAuditTrail(TEST_AUDIT_PATH);
    trail.logModeChange({
      oldMode: "shader",
      newMode: "cpu",
      source: "gm_command",
      actorId: "gm_1",
      actorName: "Tester",
      actorRole: "gm",
      socketId: "sock_1",
      reason: "manual_test",
    });
    trail.logModeChange({
      oldMode: "cpu",
      newMode: "off",
      source: "gm_command",
      actorId: "gm_1",
      actorName: "Tester",
      actorRole: "gm",
      socketId: "sock_1",
      reason: "manual_test_2",
    });

    const latest = trail.getRecent(1);
    expect(latest).toHaveLength(1);
    expect(latest[0].oldMode).toBe("cpu");
    expect(latest[0].newMode).toBe("off");
    expect(latest[0].reason).toBe("manual_test_2");
    expect(latest[0].unchanged).toBe(false);
  });

  it("marks unchanged transitions and tolerates malformed lines", () => {
    const trail = new AREModeAuditTrail(TEST_AUDIT_PATH);
    const entry = trail.logModeChange({
      oldMode: "shader",
      newMode: "shader",
      actorName: "NoOp",
    });
    expect(entry.unchanged).toBe(true);

    fs.appendFileSync(TEST_AUDIT_PATH, "{broken-json}\n", "utf-8");
    const rows = trail.getRecent(10);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((row) => row.actorName === "NoOp")).toBe(true);
  });
});

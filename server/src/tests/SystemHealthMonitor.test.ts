import { describe, it, expect } from "vitest";
import { SystemHealthMonitor } from "../modules/monitoring/SystemHealthMonitor.js";

describe("SystemHealthMonitor", () => {
  it("should report status 'ok' and a valid checkedAt timestamp", () => {
    const monitor = new SystemHealthMonitor();
    const before = Date.now();
    const report = monitor.report();
    const after = Date.now();

    expect(report.status).toBe("ok");
    expect(report.checkedAt).toBeGreaterThanOrEqual(before);
    expect(report.checkedAt).toBeLessThanOrEqual(after);
  });
});

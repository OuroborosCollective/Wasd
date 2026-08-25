import { describe, it, expect } from "vitest";
import { SystemHealthMonitor } from "../modules/monitoring/SystemHealthMonitor.js";

describe("SystemHealthMonitor", () => {
  it("reports status 'ok' with the deterministic zero checkedAt value", () => {
    const monitor = new SystemHealthMonitor();
    const report = monitor.report();

    expect(report.status).toBe("ok");
    expect(report.checkedAt).toBe(0);
  });
});

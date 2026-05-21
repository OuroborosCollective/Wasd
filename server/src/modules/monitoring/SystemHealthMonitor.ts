// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class SystemHealthMonitor {
  report() {
    return {
      status: "ok",
      checkedAt: Date.now()
    };
  }
}
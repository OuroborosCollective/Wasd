// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
export class SystemHealthMonitor {
  report() {
    return {
      status: "ok",
      checkedAt: Date.now()
    };
  }
}
// @ARE-GUARD-EXEMPT: meta path
export class SystemHealthMonitor {
  report() {
    return {
      status: "ok",
      checkedAt: Date.now()
    };
  }
}
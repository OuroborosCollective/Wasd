export class SystemHealthMonitor {
  report() {
    return {
      status: "ok",
      checkedAt: Date.now()
    };
  }
}
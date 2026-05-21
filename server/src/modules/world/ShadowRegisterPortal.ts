// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      activatedAt: Date.now()
    };
  }
}

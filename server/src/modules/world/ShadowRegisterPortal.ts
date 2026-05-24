// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      activatedAt: Date.now()
    };
  }
}
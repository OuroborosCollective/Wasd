// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      activatedAt: Date.now()
    };
  }
}
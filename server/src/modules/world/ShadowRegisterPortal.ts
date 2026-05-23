export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      activatedAt: Date.now()
    };
  }
}
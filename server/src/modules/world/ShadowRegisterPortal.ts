import { deterministicNow } from "../../core/determinism/AREDeterminism.js";

export class ShadowRegisterPortal {
  activate(regionId: string, tick: number | bigint = 0) {
    return {
      regionId,
      active: true,
      activatedAt: deterministicNow(tick || regionId)
    };
  }
}

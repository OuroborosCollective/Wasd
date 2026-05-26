import { deterministicNow } from "../../core/determinism/AREDeterminism.js";

export class WorldState {
  snapshot(data: any, tick: number | bigint = 0) {
    return {
      capturedAt: deterministicNow(tick),
      data
    };
  }
}

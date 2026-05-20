import { AREGuard } from './AREGuard';
import type { IAREPayload } from './AREPayload';
import { kAdd } from './Kappa';

/**
 * ARELORIA CORE: Deterministic Tick Prototype
 * DIRECTIVE: Ouroboros Grand Unification / ARE-Logic
 *
 * This isolated prototype proves the smallest authoritative transition:
 * next position = current position + current velocity.
 */
export class ARETick {
  static processEntity(payload: Readonly<IAREPayload>): Readonly<IAREPayload> {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(payload);

      const nextPosition = {
        x: kAdd(payload.position.x, payload.velocity.x),
        y: kAdd(payload.position.y, payload.velocity.y),
        z: kAdd(payload.position.z, payload.velocity.z),
      };

      const nextPayload: IAREPayload = {
        ...payload,
        position: nextPosition,
      };

      AREGuard.assertNoFloats(nextPayload);
      return AREGuard.protectPayload(nextPayload);
    });
  }
}

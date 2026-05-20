import { AREBrain, type AREBrainOptions } from './AREBrain';
import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { IAREPayload } from './AREPayload';
import { ARETick } from './ARETick';

export interface ARECycleOptions extends AREBrainOptions {}

/**
 * ARELORIA CORE: Deterministic Lifecycle Composition
 * DIRECTIVE: Ouroboros Grand Unification / ARE-Logic
 *
 * Isolated composition order:
 * Payload -> Brain -> Tick -> Hash
 */
export class ARECycle {
  static processCycle(payload: Readonly<IAREPayload>, options: ARECycleOptions = {}): Readonly<IAREPayload> {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(payload);

      const brainPayload = AREBrain.computeEmergence(payload, options);
      const tickPayload = ARETick.processEntity(brainPayload);
      const finalHash = AREHash.generate(tickPayload);

      const finalPayload: IAREPayload = {
        ...tickPayload,
        stateHash: finalHash,
      };

      AREGuard.assertNoFloats(finalPayload);
      return AREGuard.protectPayload(finalPayload);
    });
  }
}

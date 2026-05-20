import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { IAREPayload } from './AREPayload';
import { kAdd, kSub } from './Kappa';

export interface AREBrainOptions {
  /** Optional neighbor or sector hashes for future plexity mixing. */
  readonly neighborHashes?: readonly number[];
}

export class AREBrain {
  static computeEmergence(payload: Readonly<IAREPayload>, options: AREBrainOptions = {}): Readonly<IAREPayload> {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(payload);

      const selfDNA = AREHash.generate(payload);
      const currentDNA = AREHash.mix(selfDNA, options.neighborHashes ?? []);
      const actionGene = currentDNA & 3;
      const nextVelocity = { ...payload.velocity };

      if (actionGene === 0) {
        nextVelocity.x = kAdd(nextVelocity.x, 100);
      } else if (actionGene === 1) {
        nextVelocity.x = kSub(nextVelocity.x, 50);
      } else if (actionGene === 2) {
        nextVelocity.y = kAdd(nextVelocity.y, 200);
      }

      const nextPayload: IAREPayload = {
        ...payload,
        velocity: nextVelocity,
        stateHash: currentDNA,
      };

      AREGuard.assertNoFloats(nextPayload);
      return AREGuard.protectPayload(nextPayload);
    });
  }
}

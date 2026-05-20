import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { AREVector3, IAREPayload } from './AREPayload';
import { assertSafeInteger, kAdd, kSub, toKappa, type KappaInt } from './Kappa';

export type AREDriftAction = 'anchor_support' | 'observe' | 'adaptive_response';

export interface AREDriftResult {
  readonly playerDrift: KappaInt;
  readonly status: 'calm' | 'dissonant' | 'chaotic';
  readonly action: AREDriftAction;
}

export interface AREEntropyResult {
  readonly payload: Readonly<IAREPayload> | null;
  readonly capsule?: Readonly<IAREPayload>;
  readonly event: 'entropy_decay' | 'capsule_spawn';
}

const WARN_DRIFT = 5000;
const CRITICAL_DRIFT = 15000;

function absK(value: KappaInt): KappaInt {
  return value < 0 ? -value : value;
}

function manhattan(a: Readonly<AREVector3>, b: Readonly<AREVector3>): KappaInt {
  return kAdd(kAdd(absK(kSub(a.x, b.x)), absK(kSub(a.y, b.y))), absK(kSub(a.z, b.z)));
}

function legacyToKappa(pos: Readonly<Partial<Record<'x' | 'y' | 'z', number>>>): AREVector3 {
  return AREGuard.protectPayload({ x: toKappa(pos.x ?? 0), y: toKappa(pos.y ?? 0), z: toKappa(pos.z ?? 0) });
}

function readEnergy(payload: Readonly<IAREPayload>): KappaInt {
  const value = payload.energy;
  if (typeof value !== 'number') return 0;
  assertSafeInteger(value, 'energy');
  return value;
}

export class AREDriftEntropy {
  static computeDrift(
    legacyPosition: Readonly<Partial<Record<'x' | 'y' | 'z', number>>>,
    kappaPosition: Readonly<AREVector3>,
    relation: 'ally' | 'neutral' | 'rival' = 'neutral',
  ): AREDriftResult {
    return AREGuard.executeProtected(() => {
      const playerDrift = manhattan(legacyToKappa(legacyPosition), kappaPosition);
      const status = playerDrift >= CRITICAL_DRIFT ? 'chaotic' : playerDrift >= WARN_DRIFT ? 'dissonant' : 'calm';
      const action = status === 'calm' ? 'observe' : relation === 'ally' ? 'anchor_support' : relation === 'rival' ? 'adaptive_response' : 'observe';
      return AREGuard.protectPayload({ playerDrift, status, action });
    });
  }

  static applyEntropy(payload: Readonly<IAREPayload>, cost: KappaInt = 1): AREEntropyResult {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(payload);
      assertSafeInteger(cost, 'entropy cost');
      const nextEnergy = kSub(readEnergy(payload), cost);
      if (nextEnergy <= 0) {
        const hash = payload.stateHash ?? AREHash.generate(payload);
        const capsule: IAREPayload = {
          entityId: `capsule:${payload.entityId}:${hash}`,
          position: payload.position,
          velocity: { x: 0, y: 0, z: 0 },
          stateHash: hash,
          kind: 'EnergyCapsule',
          residualEnergy: Math.max(0, nextEnergy),
          sourceEntityId: payload.entityId,
        };
        AREGuard.assertNoFloats(capsule);
        return AREGuard.protectPayload({ payload: null, capsule: AREGuard.protectPayload(capsule), event: 'capsule_spawn' });
      }
      return AREGuard.protectPayload({ payload: AREGuard.protectPayload({ ...payload, energy: nextEnergy }), event: 'entropy_decay' });
    });
  }
}

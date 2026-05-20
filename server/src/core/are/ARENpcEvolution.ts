import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { AREVector3, IAREPayload } from './AREPayload';
import { assertSafeInteger, kAdd, kSub, type KappaInt } from './Kappa';

export interface AREFusionResult {
  readonly fused: boolean;
  readonly apex?: Readonly<IAREPayload>;
  readonly consumedEntityIds: readonly string[];
}

export interface ARECapsuleScanResult {
  readonly capsule: Readonly<IAREPayload> | null;
  readonly direction: Readonly<AREVector3> | null;
  readonly movementCost: KappaInt;
}

const DEFAULT_CHUNK_SIZE = 64000;

function readInt(payload: Readonly<IAREPayload>, key: string): KappaInt {
  const value = payload[key];
  if (typeof value !== 'number') return 0;
  assertSafeInteger(value, key);
  return value;
}

function samePosition(a: Readonly<IAREPayload>, b: Readonly<IAREPayload>): boolean {
  return a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z;
}

function absK(value: KappaInt): KappaInt {
  return value < 0 ? -value : value;
}

function distance(a: Readonly<AREVector3>, b: Readonly<AREVector3>): KappaInt {
  return kAdd(kAdd(absK(kSub(a.x, b.x)), absK(kSub(a.y, b.y))), absK(kSub(a.z, b.z)));
}

function chunkKey(position: Readonly<AREVector3>, chunkSize: KappaInt): string {
  assertSafeInteger(chunkSize, 'chunk size');
  return `${Math.trunc(position.x / chunkSize)}:${Math.trunc(position.y / chunkSize)}:${Math.trunc(position.z / chunkSize)}`;
}

export class ARENpcEvolution {
  static fuseOnSameKappaCell(a: Readonly<IAREPayload>, b: Readonly<IAREPayload>): AREFusionResult {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(a);
      AREGuard.assertNoFloats(b);
      if (!samePosition(a, b)) return AREGuard.protectPayload({ fused: false, consumedEntityIds: [] });

      const hash = ((a.stateHash ?? AREHash.generate(a)) ^ (b.stateHash ?? AREHash.generate(b))) >>> 0;
      const apex: IAREPayload = {
        entityId: `apex:${hash.toString(16)}`,
        position: a.position,
        velocity: { x: 0, y: 0, z: 0 },
        stateHash: hash,
        kind: 'ApexNpc',
        behavior: 'territory_builder',
        energy: kAdd(readInt(a, 'energy'), readInt(b, 'energy')),
        health: kAdd(readInt(a, 'health'), readInt(b, 'health')),
        parents: [a.entityId, b.entityId],
      };
      AREGuard.assertNoFloats(apex);
      return AREGuard.protectPayload({ fused: true, apex: AREGuard.protectPayload(apex), consumedEntityIds: [a.entityId, b.entityId] });
    });
  }

  static scanOwnChunkForCapsule(npc: Readonly<IAREPayload>, capsules: readonly Readonly<IAREPayload>[], chunkSize: KappaInt = DEFAULT_CHUNK_SIZE): ARECapsuleScanResult {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(npc);
      const own = chunkKey(npc.position, chunkSize);
      let best: Readonly<IAREPayload> | null = null;
      let bestDistance: KappaInt | null = null;

      for (const capsule of capsules) {
        AREGuard.assertNoFloats(capsule);
        if (capsule.kind !== 'EnergyCapsule') continue;
        if (chunkKey(capsule.position, chunkSize) !== own) continue;
        const d = distance(npc.position, capsule.position);
        if (bestDistance === null || d < bestDistance || (d === bestDistance && capsule.entityId < (best?.entityId ?? ''))) {
          best = capsule;
          bestDistance = d;
        }
      }

      if (!best) return AREGuard.protectPayload({ capsule: null, direction: null, movementCost: 0 });
      const direction = AREGuard.protectPayload({ x: kSub(best.position.x, npc.position.x), y: kSub(best.position.y, npc.position.y), z: kSub(best.position.z, npc.position.z) });
      return AREGuard.protectPayload({ capsule: best, direction, movementCost: bestDistance ?? 0 });
    });
  }
}

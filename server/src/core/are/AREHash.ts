import type { IAREPayload } from './AREPayload';

export class AREHash {
  private static readonly FNV_PRIME = 16777619;
  private static readonly OFFSET_BASIS = 2166136261;

  static generate(payload: Readonly<IAREPayload>): number {
    const stateString = AREHash.stateString(payload);
    let hash = AREHash.OFFSET_BASIS;

    for (let index = 0; index < stateString.length; index += 1) {
      hash ^= stateString.charCodeAt(index);
      hash = Math.imul(hash, AREHash.FNV_PRIME);
    }

    return hash >>> 0;
  }

  /**
   * Generate hash from any serializable object.
   * Used for NPC intents and other non-ARE payloads.
   */
  static hashObject(obj: unknown): number {
    const stateString = JSON.stringify(obj);
    let hash = AREHash.OFFSET_BASIS;

    for (let index = 0; index < stateString.length; index += 1) {
      hash ^= stateString.charCodeAt(index);
      hash = Math.imul(hash, AREHash.FNV_PRIME);
    }

    return hash >>> 0;
  }

  static mix(baseHash: number, hashes: readonly number[] = []): number {
    let hash = baseHash >>> 0;

    for (const next of hashes) {
      hash ^= next >>> 0;
      hash = Math.imul(hash, AREHash.FNV_PRIME) >>> 0;
    }

    return hash >>> 0;
  }

  private static stateString(payload: Readonly<IAREPayload>): string {
    return [
      payload.entityId,
      `${payload.position.x},${payload.position.y},${payload.position.z}`,
      `${payload.velocity.x},${payload.velocity.y},${payload.velocity.z}`,
      payload.stateHash ?? 0,
    ].join('|');
  }
}

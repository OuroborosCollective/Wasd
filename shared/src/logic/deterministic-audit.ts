export interface AuditState<T> {
  sequence: number;
  payload: Readonly<T>;
  checksum: string;
}

export interface AuditInput<T> {
  delta: Partial<T>;
  expectedPreviousChecksum?: string;
}

export class AuditDriftError extends Error {
  constructor(public expected: string, public actual: string) {
    super(`Payload drift detected. Expected checksum ${expected}, but got ${actual}`);
    this.name = 'AuditDriftError';
    Object.setPrototypeOf(this, AuditDriftError.prototype);
  }
}

/**
 * Generates a deterministic JSON representation of an object by sorting keys.
 */
function deterministicStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(deterministicStringify).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${deterministicStringify(obj[k])}`).join(',')}}`;
}

/**
 * Simple non-cryptographic hash function for checksumming (Murmur-inspired logic).
 */
function computeChecksum(data: any): string {
  const str = deterministicStringify(data);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Pure transition function: f(State_n, Input) => State_n+1
 * Validates checksums to ensure state consistency and detect drift.
 */
export function transition<T extends object>(
  currentState: AuditState<T>,
  input: AuditInput<T>
): AuditState<T> {
  // 1. Validate Checksum Drift
  if (input.expectedPreviousChecksum && currentState.checksum !== input.expectedPreviousChecksum) {
    throw new AuditDriftError(input.expectedPreviousChecksum, currentState.checksum);
  }

  // 2. Compute Next Payload
  const nextPayload: T = Object.freeze({
    ...currentState.payload,
    ...input.delta,
  });

  const nextSequence = currentState.sequence + 1;

  // 3. Generate New State Checksum
  const nextChecksum = computeChecksum({
    sequence: nextSequence,
    payload: nextPayload,
  });

  return {
    sequence: nextSequence,
    payload: nextPayload,
    checksum: nextChecksum,
  };
}

/**
 * Factory for initial state.
 */
export function createInitialState<T extends object>(initialPayload: T): AuditState<T> {
  const payload = Object.freeze(initialPayload);
  const sequence = 0;
  return {
    sequence,
    payload,
    checksum: computeChecksum({ sequence, payload }),
  };
}
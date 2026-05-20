import { AREGuard } from './AREGuard';
import { assertSafeInteger, toKappa, type KappaInt } from './Kappa';

export interface AREVector3 {
  x: KappaInt;
  y: KappaInt;
  z: KappaInt;
}

export type AREPayloadValue = string | boolean | null | KappaInt | AREPayloadValue[] | { readonly [key: string]: AREPayloadValue };

export interface IAREPayload {
  readonly entityId: string;
  readonly position: Readonly<AREVector3>;
  readonly velocity: Readonly<AREVector3>;
  readonly stateHash?: KappaInt;
  readonly [key: string]: AREPayloadValue | Readonly<AREVector3> | undefined;
}

export interface AREPayloadNormalizationOptions {
  /**
   * Dot-paths in additional state that should be converted through toKappa().
   * All other additional numeric values must already be safe integers.
   */
  readonly kappaFields?: readonly string[];
}

type RawVector3 = Partial<Record<'x' | 'y' | 'z', unknown>> | null | undefined;

function readNumber(value: unknown, path: string): number {
  if (value === null || value === undefined) return 0;
  if (typeof value !== 'number') {
    throw new Error(`[ARE-Payload] Expected numeric value at ${path}, got ${typeof value}.`);
  }
  return value;
}

function normalizeVector3(raw: RawVector3, path: string): AREVector3 {
  return {
    x: toKappa(readNumber(raw?.x, `${path}.x`)),
    y: toKappa(readNumber(raw?.y, `${path}.y`)),
    z: toKappa(readNumber(raw?.z, `${path}.z`)),
  };
}

function normalizeAdditionalState(value: unknown, path: string, kappaFields: Set<string>): AREPayloadValue {
  if (value === null) return null;

  if (typeof value === 'number') {
    if (kappaFields.has(path)) return toKappa(value);
    assertSafeInteger(value, `additional state at '${path}'`);
    return value;
  }

  if (typeof value === 'string' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeAdditionalState(item, `${path}.${index}`, kappaFields));
  }

  if (typeof value === 'object' && value !== undefined) {
    const out: Record<string, AREPayloadValue> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') continue;
      out[key] = normalizeAdditionalState((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, kappaFields);
    }
    return out;
  }

  if (value === undefined) return null;
  throw new Error(`[ARE-Payload] Unsupported additional state value at ${path}: ${typeof value}.`);
}

export class AREPayloadFactory {
  static createNormalized(
    rawEntityId: string,
    rawPosition: RawVector3,
    rawVelocity: RawVector3,
    additionalState: Record<string, unknown> = {},
    options: AREPayloadNormalizationOptions = {},
  ): Readonly<IAREPayload> {
    if (!rawEntityId || typeof rawEntityId !== 'string') {
      throw new Error('[ARE-Payload] entityId must be a non-empty string.');
    }

    const kappaFields = new Set(options.kappaFields ?? []);
    const payload: Record<string, AREPayloadValue | Readonly<AREVector3> | undefined> = {
      entityId: rawEntityId,
      position: normalizeVector3(rawPosition, 'position'),
      velocity: normalizeVector3(rawVelocity, 'velocity'),
    };

    for (const key of Reflect.ownKeys(additionalState)) {
      if (typeof key !== 'string') continue;
      if (key === 'entityId' || key === 'position' || key === 'velocity') {
        throw new Error(`[ARE-Payload] Reserved payload key cannot be overridden: ${key}.`);
      }
      payload[key] = normalizeAdditionalState(additionalState[key], key, kappaFields);
    }

    AREGuard.assertNoFloats(payload);
    return AREGuard.protectPayload(payload as IAREPayload);
  }
}

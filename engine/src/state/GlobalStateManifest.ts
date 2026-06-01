export type ManifestPayload = Record<string, unknown>;

export interface ICryptoDependencyHeader {
  readonly tickSequence: number;
  readonly serverTimestamp: number;
  readonly stateHash: string;
  readonly authoritySignature: string;
  readonly previousStateHash: string;
  readonly integrityNonce: string;
}

export interface IManifestDependency {
  readonly componentId: string;
  readonly checksum: string;
  readonly schemaVersion: number;
}

export interface GlobalStateManifestInput {
  readonly tickSequence: number;
  readonly serverTimestamp: number;
  readonly stateHash: string;
  readonly authoritySignature: string;
  readonly previousStateHash: string;
  readonly integrityNonce: string;
  readonly dependencies?: readonly IManifestDependency[];
  readonly payload?: ManifestPayload;
}

export class GlobalStateManifest {
  public static readonly TICK_RATE_HZ = 10;
  public static readonly TICK_INTERVAL_MS =
    1000 / GlobalStateManifest.TICK_RATE_HZ;

  public readonly header: ICryptoDependencyHeader;
  public readonly dependencies: readonly IManifestDependency[];
  public readonly payload: ManifestPayload;

  public constructor(input: GlobalStateManifestInput) {
    this.header = Object.freeze({
      tickSequence: input.tickSequence,
      serverTimestamp: input.serverTimestamp,
      stateHash: input.stateHash,
      authoritySignature: input.authoritySignature,
      previousStateHash: input.previousStateHash,
      integrityNonce: input.integrityNonce,
    });

    this.dependencies = Object.freeze([...(input.dependencies ?? [])]);
    this.payload = Object.freeze({ ...(input.payload ?? {}) });
  }

  public serialize(): Uint8Array {
    const jsonString = stableStringify({
      h: this.header,
      d: this.dependencies,
      p: this.payload,
    });

    return new TextEncoder().encode(jsonString);
  }

  public toCanonicalString(): string {
    return stableStringify({
      h: this.header,
      d: this.dependencies,
      p: this.payload,
    });
  }

  public validateSequence(previousManifest: GlobalStateManifest): boolean {
    return (
      this.header.tickSequence === previousManifest.header.tickSequence + 1 &&
      this.header.previousStateHash === previousManifest.header.stateHash
    );
  }

  public isWithinTimingWindow(
    currentServerTime: number,
    toleranceMs: number = 50,
  ): boolean {
    const drift = Math.abs(currentServerTime - this.header.serverTimestamp);

    return drift <= GlobalStateManifest.TICK_INTERVAL_MS + toleranceMs;
  }

  public hasValidDependencySchema(minSchemaVersion = 1): boolean {
    return this.dependencies.every(
      (dependency) =>
        dependency.componentId.length > 0 &&
        dependency.checksum.length > 0 &&
        dependency.schemaVersion >= minSchemaVersion,
    );
  }
}

/**
 * Deterministische JSON-Serialisierung.
 * Wichtig für reproduzierbare Hashes im 10-Hz-State-Chain-System.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}

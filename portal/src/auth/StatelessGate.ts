/**
 * StatelessGate — deterministic HKDF gate for the 10Hz world server.
 *
 * Rules:
 * - No Date.now(), Math.random(), mutable singleton state, or wall-clock dependency.
 * - Token material is derived only from secret + canonical scope + logical tick/index.
 * - The server remains authoritative for tick indexes and replay policy.
 * - Client-provided ticks are hints at most; verify against server-side tick windows.
 */

export const WORLD_SERVER_TICK_HZ = 10 as const;
export const WORLD_SERVER_TICK_MS = 100 as const;
export const STATELESS_GATE_VERSION = "v2" as const;
export const STATELESS_GATE_NAMESPACE = "areloria:world-server:stateless-gate" as const;

export type StatelessGatePurpose =
  | "authentication"
  | "login"
  | "world-entry"
  | "world-tick"
  | "trade-confirm"
  | "admin-action"
  | "test";

export interface StatelessToken {
  token: string;
  index: number;
}

export interface StatelessTickToken extends StatelessToken {
  tick: number;
  tickHz: typeof WORLD_SERVER_TICK_HZ;
}

export interface StatelessTokenScope {
  /** Stable account/player id. Prefer an internal id over email. */
  userId?: string;

  /** Realm/shard/world id. */
  realmId?: string;

  /** Server/session/challenge id. Must be deterministic input, not random inside this class. */
  challengeId?: string;

  /** Domain separation for different systems. */
  purpose?: StatelessGatePurpose | string;
}

export interface StatelessGateOptions {
  /** Token namespace and HKDF info namespace. */
  namespace?: string;

  /** Token version prefix and HKDF info version. */
  version?: string;

  /** Derived token byte length. 32 bytes = 256-bit token. */
  outputBytes?: number;

  /** Minimum accepted userSecret length. */
  minSecretLength?: number;

  /** Allows verifying old v1 raw-hex tokens during migration only. */
  acceptLegacyRawHex?: boolean;
}

export interface VerifyWindowResult {
  ok: boolean;
  token: string;
  expectedCenterIndex: number;
  matchedIndex: number | null;
  drift: number | null;
}

export interface TickWindowOptions {
  /** Server-authoritative center tick. */
  centerTick: number;

  /** Maximum accepted tick drift around centerTick. */
  radiusTicks?: number;

  /** Optional monotonic replay floor. Tokens at/below this tick are rejected. */
  minExclusiveTick?: number;
}

export class StatelessGate {
  private static readonly DEFAULT_OUTPUT_BYTES = 32;
  private static readonly DEFAULT_MIN_SECRET_LENGTH = 32;
  private static readonly MAX_WINDOW_RADIUS = 128;

  private readonly encoder = new TextEncoder();
  private readonly namespace: string;
  private readonly version: string;
  private readonly outputBytes: number;
  private readonly minSecretLength: number;
  private readonly acceptLegacyRawHex: boolean;

  public constructor(options: StatelessGateOptions = {}) {
    this.namespace = options.namespace ?? STATELESS_GATE_NAMESPACE;
    this.version = options.version ?? STATELESS_GATE_VERSION;
    this.outputBytes = options.outputBytes ?? StatelessGate.DEFAULT_OUTPUT_BYTES;
    this.minSecretLength = options.minSecretLength ?? StatelessGate.DEFAULT_MIN_SECRET_LENGTH;
    this.acceptLegacyRawHex = options.acceptLegacyRawHex ?? false;

    this.assertAsciiSegment("namespace", this.namespace);
    this.assertAsciiSegment("version", this.version);

    if (!Number.isInteger(this.outputBytes) || this.outputBytes < 16 || this.outputBytes > 64) {
      throw new Error("StatelessGate outputBytes must be an integer between 16 and 64.");
    }

    if (!Number.isInteger(this.minSecretLength) || this.minSecretLength < 16) {
      throw new Error("StatelessGate minSecretLength must be an integer >= 16.");
    }
  }

  public generateToken(userSecret: string, logicalIndex: number, scope: StatelessTokenScope = {}): Promise<string> {
    return this.generateTokenForIndex(userSecret, logicalIndex, scope);
  }

  public async verifyToken(
    providedToken: string,
    userSecret: string,
    logicalIndex: number,
    scope: StatelessTokenScope = {},
  ): Promise<boolean> {
    this.assertLogicalIndex(logicalIndex);

    if (!this.isTokenShapeValid(providedToken)) {
      return false;
    }

    const expectedToken = await this.generateTokenForIndex(userSecret, logicalIndex, scope);
    return this.secureCompare(providedToken, expectedToken);
  }

  public async generateTickToken(
    userSecret: string,
    tick: number,
    scope: StatelessTokenScope = {},
  ): Promise<StatelessTickToken> {
    this.assertTick(tick);
    const token = await this.generateTokenForIndex(userSecret, tick, this.withTickPurpose(scope));

    return {
      token,
      index: tick,
      tick,
      tickHz: WORLD_SERVER_TICK_HZ,
    };
  }

  public async verifyTickToken(
    providedToken: string,
    userSecret: string,
    tick: number,
    scope: StatelessTokenScope = {},
  ): Promise<boolean> {
    this.assertTick(tick);
    return this.verifyToken(providedToken, userSecret, tick, this.withTickPurpose(scope));
  }

  public async verifyTickWindow(
    providedToken: string,
    userSecret: string,
    options: TickWindowOptions,
    scope: StatelessTokenScope = {},
  ): Promise<VerifyWindowResult> {
    this.assertTick(options.centerTick);
    const radiusTicks = options.radiusTicks ?? 0;
    this.assertWindowRadius(radiusTicks);

    if (!this.isTokenShapeValid(providedToken)) {
      return this.windowResult(false, providedToken, options.centerTick, null);
    }

    for (let offset = -radiusTicks; offset <= radiusTicks; offset += 1) {
      const tick = options.centerTick + offset;
      if (tick < 0) continue;
      if (options.minExclusiveTick !== undefined && tick <= options.minExclusiveTick) continue;

      const ok = await this.verifyTickToken(providedToken, userSecret, tick, scope);
      if (ok) {
        return this.windowResult(true, providedToken, options.centerTick, tick);
      }
    }

    return this.windowResult(false, providedToken, options.centerTick, null);
  }

  public async generateWindow(
    userSecret: string,
    startIndex: number,
    count: number,
    scope: StatelessTokenScope = {},
  ): Promise<StatelessToken[]> {
    this.assertLogicalIndex(startIndex);

    if (!Number.isInteger(count) || count < 1 || count > 256) {
      throw new Error("Token window count must be an integer between 1 and 256.");
    }

    const tokens: StatelessToken[] = [];
    for (let offset = 0; offset < count; offset += 1) {
      const index = startIndex + offset;
      tokens.push({
        index,
        token: await this.generateTokenForIndex(userSecret, index, scope),
      });
    }

    return tokens;
  }

  public async verifyTokenWindow(
    providedToken: string,
    userSecret: string,
    centerIndex: number,
    radius: number,
    scope: StatelessTokenScope = {},
  ): Promise<VerifyWindowResult> {
    this.assertLogicalIndex(centerIndex);
    this.assertWindowRadius(radius);

    if (!this.isTokenShapeValid(providedToken)) {
      return this.windowResult(false, providedToken, centerIndex, null);
    }

    for (let offset = -radius; offset <= radius; offset += 1) {
      const index = centerIndex + offset;
      if (index < 0) continue;

      const ok = await this.verifyToken(providedToken, userSecret, index, scope);
      if (ok) {
        return this.windowResult(true, providedToken, centerIndex, index);
      }
    }

    return this.windowResult(false, providedToken, centerIndex, null);
  }

  /**
   * Deterministically converts elapsed simulation milliseconds to a 10Hz tick.
   * Caller supplies elapsedMs from the authoritative simulation timeline.
   */
  public static tickFromElapsedMs(elapsedMs: number): number {
    if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
      throw new Error("elapsedMs must be a non-negative safe integer.");
    }

    return Math.floor(elapsedMs / WORLD_SERVER_TICK_MS);
  }

  public static elapsedMsFromTick(tick: number): number {
    StatelessGate.assertStaticTick(tick);
    return tick * WORLD_SERVER_TICK_MS;
  }

  public static nextTick(tick: number): number {
    StatelessGate.assertStaticTick(tick);
    return tick + 1;
  }

  public static isValidTick(tick: number): boolean {
    return Number.isSafeInteger(tick) && tick >= 0;
  }

  private async generateTokenForIndex(
    userSecret: string,
    logicalIndex: number,
    scope: StatelessTokenScope,
  ): Promise<string> {
    this.assertSecret(userSecret);
    this.assertLogicalIndex(logicalIndex);

    const keyMaterial = await this.importKeyMaterial(userSecret);
    const salt = this.encodeIndexSalt(logicalIndex);
    const info = this.encodeInfo(scope);

    const derivedBits = await this.getCrypto().subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info,
      },
      keyMaterial,
      this.outputBytes * 8,
    );

    return this.formatToken(this.arrayBufferToHex(derivedBits));
  }

  private async importKeyMaterial(secret: string): Promise<CryptoKey> {
    return this.getCrypto().subtle.importKey(
      "raw",
      this.encoder.encode(secret),
      { name: "HKDF" },
      false,
      ["deriveBits"],
    );
  }

  /** Stable 64-bit big-endian salt for the logical index/tick. */
  private encodeIndexSalt(logicalIndex: number): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    const high = Math.floor(logicalIndex / 0x100000000);
    const low = logicalIndex >>> 0;

    view.setUint32(0, high, false);
    view.setUint32(4, low, false);

    return new Uint8Array(buffer);
  }

  /** Canonical length-prefixed HKDF info. No JSON order drift, no delimiter ambiguity. */
  private encodeInfo(scope: StatelessTokenScope): Uint8Array {
    const purpose = scope.purpose ?? "authentication";
    const fields: readonly [string, string][] = [
      ["namespace", this.namespace],
      ["version", this.version],
      ["tickHz", String(WORLD_SERVER_TICK_HZ)],
      ["userId", scope.userId ?? "anonymous"],
      ["realmId", scope.realmId ?? "global"],
      ["challengeId", scope.challengeId ?? "none"],
      ["purpose", purpose],
    ];

    const canonical = fields
      .map(([key, value]) => {
        this.assertAsciiSegment(key, value);
        return `${key.length}:${key}${value.length}:${value}`;
      })
      .join("");

    return this.encoder.encode(canonical);
  }

  private withTickPurpose(scope: StatelessTokenScope): StatelessTokenScope {
    return {
      ...scope,
      purpose: scope.purpose ?? "world-tick",
    };
  }

  private formatToken(hex: string): string {
    return `sg_${this.version}_${hex}`;
  }

  private isTokenShapeValid(token: string): boolean {
    if (typeof token !== "string") return false;

    const prefix = `sg_${this.version}_`;
    if (token.startsWith(prefix)) {
      const hex = token.slice(prefix.length);
      return hex.length === this.outputBytes * 2 && /^[a-f0-9]+$/u.test(hex);
    }

    return this.acceptLegacyRawHex && token.length === 64 && /^[a-f0-9]+$/u.test(token);
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let out = "";

    for (let index = 0; index < bytes.length; index += 1) {
      out += bytes[index]!.toString(16).padStart(2, "0");
    }

    return out;
  }

  /** Constant-time-ish compare without early return on length mismatch. */
  private secureCompare(a: string, b: string): boolean {
    const maxLength = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;

    for (let index = 0; index < maxLength; index += 1) {
      const ac = index < a.length ? a.charCodeAt(index) : 0;
      const bc = index < b.length ? b.charCodeAt(index) : 0;
      diff |= ac ^ bc;
    }

    return diff === 0;
  }

  private windowResult(
    ok: boolean,
    token: string,
    expectedCenterIndex: number,
    matchedIndex: number | null,
  ): VerifyWindowResult {
    return {
      ok,
      token,
      expectedCenterIndex,
      matchedIndex,
      drift: matchedIndex === null ? null : matchedIndex - expectedCenterIndex,
    };
  }

  private assertSecret(secret: string): void {
    if (typeof secret !== "string" || secret.length < this.minSecretLength) {
      throw new Error(`userSecret must be a string with at least ${this.minSecretLength} characters.`);
    }
  }

  private assertLogicalIndex(index: number): void {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error("logicalIndex must be a non-negative safe integer.");
    }
  }

  private assertTick(tick: number): void {
    StatelessGate.assertStaticTick(tick);
  }

  private static assertStaticTick(tick: number): void {
    if (!StatelessGate.isValidTick(tick)) {
      throw new Error("tick must be a non-negative safe integer.");
    }
  }

  private assertWindowRadius(radius: number): void {
    if (!Number.isInteger(radius) || radius < 0 || radius > StatelessGate.MAX_WINDOW_RADIUS) {
      throw new Error(`window radius must be an integer between 0 and ${StatelessGate.MAX_WINDOW_RADIUS}.`);
    }
  }

  private assertAsciiSegment(name: string, value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${name} must be a non-empty string.`);
    }

    if (!/^[\x20-\x7e]+$/u.test(value)) {
      throw new Error(`${name} must contain printable ASCII only for deterministic canonical encoding.`);
    }
  }

  private getCrypto(): Crypto {
    if (!globalThis.crypto?.subtle) {
      throw new Error("WebCrypto subtle API is not available in this runtime.");
    }

    return globalThis.crypto;
  }
}

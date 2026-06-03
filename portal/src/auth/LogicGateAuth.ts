/**
 * LogicGateAuth.ts
 * Deterministic Logic-Gate Authenticator — hardened version
 *
 * Ziele:
 * - Kein Date.now()
 * - Kein Math.random()
 * - Kein Floating-Point-Drift für Gate-Logik
 * - BigInt-only deterministic kappa space
 * - WebCrypto HMAC token binding für echte Authentizität
 * - O(1) Gateprüfung
 *
 * Hinweis:
 * Hardware-Fingerprints sind NICHT geheim.
 * Sie dienen hier nur als deterministic device-signal.
 * Die echte Sicherheit kommt vom userSecret / serverSecret.
 */

export type Hex64 = string;
export type Hex256 = string;

export interface HardwareFingerprintInput {
  cpuCores: number;
  memoryGb: number;
  screenRes: readonly [number, number];
  colorDepth: number;
  platformCode?: number;
  userAgentBucket?: number;
}

export interface LogicGatePosition {
  x: bigint;
  y: bigint;
}

export interface AuthSession {
  userId: string;
  fingerprint64: Hex64;
  gridPosition: {
    x: string;
    y: string;
  };
  dimension: string;
  createdTick: bigint;
  expiresTick: bigint;
  logicalIndex: string;
  kappaPos64: Hex64;
  token256: Hex256;
}

export interface CreateAuthSessionInput {
  userId: string;
  userSecret: string;
  fingerprint: bigint;
  gridPosition: LogicGatePosition;
  dimension?: bigint;
  currentTick: bigint;
  ttlTicks?: bigint;
}

export interface ValidateAuthSessionInput {
  session: AuthSession;
  userSecret: string;
  currentTick: bigint;
}

export class LogicGateAuth {
  private static readonly DEFAULT_DIMENSION = 1000n;
  private static readonly DEFAULT_TTL_TICKS = 36_000n; // Beispiel: 1h bei 10Hz

  private static readonly MASK_64 = 0xffffffffffffffffn;
  private static readonly PRIME_SEED = 0xbf58476d1ce4e5b9n;
  private static readonly MIX_A = 0xd6e8feb86659fd93n;
  private static readonly MIX_B = 0x9e3779b185ebca87n;
  private static readonly MIX_C = 0x94d049bb133111ebn;

  private static readonly TOKEN_CONTEXT = "LogicGateAuth:v2:deterministic-session-token";

  /**
   * Sicheres 64-bit Rotate-Left.
   */
  private static rotl64(value: bigint, shift: bigint): bigint {
    const s = shift & 63n;
    return ((value << s) | (value >> (64n - s))) & this.MASK_64;
  }

  /**
   * SplitMix64-artiger deterministic Mixer.
   */
  private static mix64(value: bigint): bigint {
    let z = value & this.MASK_64;
    z = (z ^ (z >> 30n)) * this.MIX_A;
    z &= this.MASK_64;
    z = (z ^ (z >> 27n)) * this.MIX_C;
    z &= this.MASK_64;
    return (z ^ (z >> 31n)) & this.MASK_64;
  }

  /**
   * Deterministischer logicalIndex im 2D-Grid.
   */
  public static calculateLogicalIndex(
    x: bigint,
    y: bigint,
    dimension: bigint
  ): bigint {
    this.assertValidGridPosition(x, y, dimension);
    return y * dimension + x;
  }

  /**
   * Position-spezifischer kappa key.
   */
  public static calculateKappaPos(logicalIndex: bigint): bigint {
    let kappa = logicalIndex ^ this.PRIME_SEED;
    kappa = this.mix64(kappa);
    kappa = this.rotl64(kappa ^ this.MIX_B, 17n);
    kappa = this.mix64(kappa);
    return kappa & this.MASK_64;
  }

  /**
   * Stable hardware fingerprint.
   *
   * Wichtig:
   * Das ist deterministic, aber nicht geheim.
   * Nicht als Passwort verwenden.
   */
  public static generateHardwareFingerprint(data: HardwareFingerprintInput): bigint {
    const width = BigInt(this.safePositiveInteger(data.screenRes[0], "screenRes[0]"));
    const height = BigInt(this.safePositiveInteger(data.screenRes[1], "screenRes[1]"));

    const payload = [
      BigInt(this.safePositiveInteger(data.cpuCores, "cpuCores")),
      BigInt(this.safePositiveInteger(data.memoryGb, "memoryGb")),
      width,
      height,
      BigInt(this.safePositiveInteger(data.colorDepth, "colorDepth")),
      BigInt(this.safeNonNegativeInteger(data.platformCode ?? 0, "platformCode")),
      BigInt(this.safeNonNegativeInteger(data.userAgentBucket ?? 0, "userAgentBucket")),
    ];

    let hash = this.PRIME_SEED;

    for (const value of payload) {
      hash ^= value & this.MASK_64;
      hash = this.mix64(hash);
      hash = this.rotl64(hash, 21n);
      hash = (hash * this.MIX_B) & this.MASK_64;
    }

    return hash & this.MASK_64;
  }

  /**
   * Soft-Gate: Prüft, ob Fingerprint und Position deterministisch zusammenpassen.
   *
   * Nicht als alleinige Auth verwenden.
   * Nutze zusätzlich generateAuthToken/validateAuthSession.
   */
  public static validateFingerprintGate(
    fingerprint: bigint,
    x: bigint,
    y: bigint,
    dimension: bigint,
    difficultyBits: bigint = 12n
  ): boolean {
    if (difficultyBits < 1n || difficultyBits > 32n) {
      throw new Error("difficultyBits must be between 1 and 32");
    }

    const index = this.calculateLogicalIndex(x, y, dimension);
    const kappa = this.calculateKappaPos(index);

    const alignment = this.mix64(fingerprint ^ index ^ kappa);
    const mask = (1n << difficultyBits) - 1n;

    return (alignment & mask) === (kappa & mask);
  }

  /**
   * Deterministic fixed-point converter ohne Math.round.
   *
   * Beispiele:
   * toFixedPoint("12.345", 6) => 12345000n
   * toFixedPoint("-1.5", 6) => -1500000n
   */
  public static toFixedPoint(value: string | number, decimals = 6): bigint {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new Error("decimals must be an integer between 0 and 18");
    }

    const raw = String(value).trim();

    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      throw new Error(`Invalid decimal value: ${raw}`);
    }

    const negative = raw.startsWith("-");
    const normalized = negative ? raw.slice(1) : raw;

    const [wholePart, fractionPartRaw = ""] = normalized.split(".");
    const fractionPart = fractionPartRaw.padEnd(decimals, "0").slice(0, decimals);

    const whole = BigInt(wholePart || "0") * 10n ** BigInt(decimals);
    const fraction = BigInt(fractionPart || "0");

    const result = whole + fraction;
    return negative ? -result : result;
  }

  /**
   * Erzeugt einen secret-bound Auth Token.
   *
   * Der Token bindet:
   * - userId
   * - fingerprint
   * - grid position
   * - logicalIndex
   * - kappaPos
   * - createdTick
   * - expiresTick
   */
  public static async generateAuthToken(input: {
    userId: string;
    userSecret: string;
    fingerprint: bigint;
    x: bigint;
    y: bigint;
    dimension: bigint;
    createdTick: bigint;
    expiresTick: bigint;
  }): Promise<Hex256> {
    const index = this.calculateLogicalIndex(input.x, input.y, input.dimension);
    const kappa = this.calculateKappaPos(index);

    const message = [
      this.TOKEN_CONTEXT,
      input.userId,
      this.toHex64(input.fingerprint),
      input.x.toString(),
      input.y.toString(),
      input.dimension.toString(),
      index.toString(),
      this.toHex64(kappa),
      input.createdTick.toString(),
      input.expiresTick.toString(),
    ].join("|");

    return this.hmacSha256Hex(input.userSecret, message);
  }

  /**
   * Erstellt deterministic Session.
   *
   * Kein Date.now().
   * currentTick muss vom Server/ARE-WorldTick kommen.
   */
  public static async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const dimension = input.dimension ?? this.DEFAULT_DIMENSION;
    const ttlTicks = input.ttlTicks ?? this.DEFAULT_TTL_TICKS;

    if (ttlTicks <= 0n) {
      throw new Error("ttlTicks must be > 0");
    }

    const { x, y } = input.gridPosition;
    const logicalIndex = this.calculateLogicalIndex(x, y, dimension);
    const kappaPos = this.calculateKappaPos(logicalIndex);

    const createdTick = input.currentTick;
    const expiresTick = createdTick + ttlTicks;

    const token256 = await this.generateAuthToken({
      userId: input.userId,
      userSecret: input.userSecret,
      fingerprint: input.fingerprint,
      x,
      y,
      dimension,
      createdTick,
      expiresTick,
    });

    return {
      userId: input.userId,
      fingerprint64: this.toHex64(input.fingerprint),
      gridPosition: {
        x: x.toString(),
        y: y.toString(),
      },
      dimension: dimension.toString(),
      createdTick,
      expiresTick,
      logicalIndex: logicalIndex.toString(),
      kappaPos64: this.toHex64(kappaPos),
      token256,
    };
  }

  /**
   * Validiert Session deterministic gegen currentTick.
   */
  public static async validateAuthSession(input: ValidateAuthSessionInput): Promise<boolean> {
    const session = input.session;

    if (input.currentTick >= session.expiresTick) {
      return false;
    }

    const x = BigInt(session.gridPosition.x);
    const y = BigInt(session.gridPosition.y);
    const dimension = BigInt(session.dimension);
    const fingerprint = this.fromHex64(session.fingerprint64);

    const logicalIndex = this.calculateLogicalIndex(x, y, dimension);
    const kappaPos = this.calculateKappaPos(logicalIndex);

    if (logicalIndex.toString() !== session.logicalIndex) {
      return false;
    }

    if (this.toHex64(kappaPos) !== session.kappaPos64) {
      return false;
    }

    const expectedToken = await this.generateAuthToken({
      userId: session.userId,
      userSecret: input.userSecret,
      fingerprint,
      x,
      y,
      dimension,
      createdTick: session.createdTick,
      expiresTick: session.expiresTick,
    });

    return this.constantTimeEqualHex(session.token256, expectedToken);
  }

  /**
   * BigInt-safe Session Export.
   * Nützlich für localStorage, Redis, DB, JSON.
   */
  public static serializeSession(session: AuthSession): string {
    return JSON.stringify({
      ...session,
      createdTick: session.createdTick.toString(),
      expiresTick: session.expiresTick.toString(),
    });
  }

  /**
   * BigInt-safe Session Import.
   */
  public static deserializeSession(payload: string): AuthSession {
    const parsed = JSON.parse(payload) as Omit<AuthSession, "createdTick" | "expiresTick"> & {
      createdTick: string;
      expiresTick: string;
    };

    return {
      ...parsed,
      createdTick: BigInt(parsed.createdTick),
      expiresTick: BigInt(parsed.expiresTick),
    };
  }

  public static toHex64(value: bigint): Hex64 {
    return `0x${(value & this.MASK_64).toString(16).padStart(16, "0")}`;
  }

  public static fromHex64(hex: string): bigint {
    if (!/^0x[0-9a-fA-F]{16}$/.test(hex)) {
      throw new Error(`Invalid Hex64: ${hex}`);
    }

    return BigInt(hex) & this.MASK_64;
  }

  private static assertValidGridPosition(x: bigint, y: bigint, dimension: bigint): void {
    if (dimension <= 0n) {
      throw new Error("dimension must be > 0");
    }

    if (x < 0n || y < 0n) {
      throw new Error("grid position must be non-negative");
    }

    if (x >= dimension || y >= dimension) {
      throw new Error("grid position out of bounds");
    }
  }

  private static safePositiveInteger(value: number, field: string): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`${field} must be a positive safe integer`);
    }

    return value;
  }

  private static safeNonNegativeInteger(value: number, field: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative safe integer`);
    }

    return value;
  }

  private static async hmacSha256Hex(secret: string, message: string): Promise<Hex256> {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return this.arrayBufferToHex(signature);
  }

  private static arrayBufferToHex(buffer: ArrayBuffer): Hex256 {
    const bytes = new Uint8Array(buffer);
    let hex = "";

    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, "0");
    }

    return hex;
  }

  /**
   * Constant-time-ish compare für gleichlange Hex-Strings.
   */
  private static constantTimeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let diff = 0;

    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
  }
}

/**
 * Beispiel:
 *
 * const fingerprint = LogicGateAuth.generateHardwareFingerprint({
 *   cpuCores: navigator.hardwareConcurrency || 4,
 *   memoryGb: 8,
 *   screenRes: [screen.width, screen.height],
 *   colorDepth: screen.colorDepth,
 * });
 *
 * const session = await LogicGateAuth.createAuthSession({
 *   userId: "player_001",
 *   userSecret: "SERVER_OR_USER_SECRET_DO_NOT_EXPOSE_PUBLICLY",
 *   fingerprint,
 *   gridPosition: { x: 12n, y: 34n },
 *   dimension: 1000n,
 *   currentTick: 123456n,
 *   ttlTicks: 36000n,
 * });
 *
 * const ok = await LogicGateAuth.validateAuthSession({
 *   session,
 *   userSecret: "SERVER_OR_USER_SECRET_DO_NOT_EXPOSE_PUBLICLY",
 *   currentTick: 123500n,
 * });
 */

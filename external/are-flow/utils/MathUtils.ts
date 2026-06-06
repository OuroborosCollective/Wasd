/**
 * FixedMath.ts
 *
 * Deterministische Fixed-Point-Mathematik für Server-Tick, Replay,
 * Kappa/Resonance, Bewegung, Progress, Cooldowns und ARE-Logik.
 *
 * Prinzip:
 * - Intern NUR bigint
 * - Kein Float in der Simulation
 * - Kein stilles Division-by-zero
 * - Kein Number.MAX_SAFE_INTEGER-Risiko
 * - Deterministische Rundung
 * - Stabile Serialisierung für Netzwerk/Persistenz
 */

export type Fixed = bigint & { readonly __brand: "Fixed" };
export type TickIndex = bigint & { readonly __brand: "TickIndex" };

export interface FixedVec2 {
  readonly x: Fixed;
  readonly y: Fixed;
}

export interface FixedVec3 {
  readonly x: Fixed;
  readonly y: Fixed;
  readonly z: Fixed;
}

export interface FixedBounds {
  readonly min: Fixed;
  readonly max: Fixed;
}

export class FixedMath {
  /**
   * 9 Dezimalstellen:
   * 1.0 = 1_000_000_000n
   *
   * Stark genug für MMORPG-Positionen, Kappa, Cooldowns, Progress.
   */
  public static readonly SCALE_RAW = 1_000_000_000n;
  public static readonly DECIMALS = 9;

  public static readonly ZERO = 0n as Fixed;
  public static readonly ONE = FixedMath.SCALE_RAW as Fixed;
  public static readonly TWO = 2_000_000_000n as Fixed;
  public static readonly HALF = 500_000_000n as Fixed;
  public static readonly TEN = 10_000_000_000n as Fixed;

  /**
   * 10Hz Engine:
   * 1 Tick = 100ms = 0.1 Sekunden
   */
  public static readonly TICK_RATE = 10n;
  public static readonly TICK_MS = 100n;
  public static readonly DT_10HZ = (FixedMath.SCALE_RAW / FixedMath.TICK_RATE) as Fixed;

  /**
   * Kappa-Konvention:
   * kappaNorm: 0.0 bis 1.0
   */
  public static readonly KAPPA_MIN = FixedMath.ZERO;
  public static readonly KAPPA_MAX = FixedMath.ONE;

  /**
   * Harte Sicherheitsgrenze für Weltkoordinaten.
   * Beispiel: +-1 Milliarde World Units.
   */
  public static readonly WORLD_LIMIT = (1_000_000_000n * FixedMath.SCALE_RAW) as Fixed;

  private constructor() {}

  // ---------------------------------------------------------------------------
  // Branding / Rohzugriff
  // ---------------------------------------------------------------------------

  public static raw(value: bigint): Fixed {
    return value as Fixed;
  }

  public static unraw(value: Fixed): bigint {
    return value as bigint;
  }

  public static tick(value: bigint | number): TickIndex {
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Invalid TickIndex number: ${value}`);
      }

      return BigInt(value) as TickIndex;
    }

    if (value < 0n) {
      throw new Error(`Invalid TickIndex bigint: ${value}`);
    }

    return value as TickIndex;
  }

  // ---------------------------------------------------------------------------
  // Konstruktion
  // ---------------------------------------------------------------------------

  /**
   * Nur für UI/Input/Tests.
   * Nicht tief in der Simulation verwenden.
   */
  public static fromNumber(value: number): Fixed {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid number for Fixed: ${value}`);
    }

    return BigInt(Math.round(value * Number(FixedMath.SCALE_RAW))) as Fixed;
  }

  /**
   * Deterministische Erstellung aus Integer.
   * 5 -> 5.0 fixed
   */
  public static fromInt(value: number | bigint): Fixed {
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new Error(`Unsafe integer for Fixed: ${value}`);
      }

      return (BigInt(value) * FixedMath.SCALE_RAW) as Fixed;
    }

    return (value * FixedMath.SCALE_RAW) as Fixed;
  }

  /**
   * Deterministischer Parser:
   *
   * "12"          -> 12.0
   * "12.5"        -> 12.5
   * "-0.125"      -> -0.125
   * "1.123456789" -> exakt
   *
   * Keine Float-Konvertierung.
   */
  public static parse(value: string): Fixed {
    const trimmed = value.trim();

    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error(`Invalid fixed string: "${value}"`);
    }

    const negative = trimmed.startsWith("-");
    const normalized = negative ? trimmed.slice(1) : trimmed;

    const [intPartRaw, fracPartRaw = ""] = normalized.split(".");
    const intPart = BigInt(intPartRaw);

    const fracPadded = fracPartRaw
      .slice(0, FixedMath.DECIMALS)
      .padEnd(FixedMath.DECIMALS, "0");

    const fracPart = BigInt(fracPadded || "0");

    const result = intPart * FixedMath.SCALE_RAW + fracPart;

    return (negative ? -result : result) as Fixed;
  }

  /**
   * Erzeugt Fixed direkt aus rohem Skalenwert.
   * Achtung: 1_000_000_000n bedeutet 1.0.
   */
  public static fromRaw(value: bigint): Fixed {
    return value as Fixed;
  }

  /**
   * Nützlich für Prozentwerte.
   *
   * percent(25) = 0.25
   * percent(100) = 1.0
   */
  public static percent(value: number | bigint): Fixed {
    const raw = typeof value === "number" ? BigInt(value) : value;
    return ((raw * FixedMath.SCALE_RAW) / 100n) as Fixed;
  }

  // ---------------------------------------------------------------------------
  // Ausgabe / Serialisierung
  // ---------------------------------------------------------------------------

  /**
   * Nur für Rendering/UI/Debug.
   */
  public static toNumber(value: Fixed): number {
    return Number(value) / Number(FixedMath.SCALE_RAW);
  }

  /**
   * Stabile Netzwerk-/Persistenz-Serialisierung.
   * Speichert den rohen bigint als string.
   */
  public static serialize(value: Fixed): string {
    return value.toString();
  }

  public static deserialize(value: string): Fixed {
    if (!/^-?\d+$/.test(value)) {
      throw new Error(`Invalid serialized Fixed: "${value}"`);
    }

    return BigInt(value) as Fixed;
  }

  /**
   * Menschlich lesbare Ausgabe.
   * Kein Float nötig.
   */
  public static toDecimalString(value: Fixed, decimals: number = 6): string {
    if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > FixedMath.DECIMALS) {
      throw new Error(`Invalid decimals: ${decimals}`);
    }

    const negative = value < 0n;
    const abs = negative ? -value : value;

    const integer = abs / FixedMath.SCALE_RAW;
    const fraction = abs % FixedMath.SCALE_RAW;

    if (decimals === 0) {
      return `${negative ? "-" : ""}${integer.toString()}`;
    }

    const frac = fraction
      .toString()
      .padStart(FixedMath.DECIMALS, "0")
      .slice(0, decimals);

    return `${negative ? "-" : ""}${integer.toString()}.${frac}`;
  }

  // ---------------------------------------------------------------------------
  // Basisoperationen
  // ---------------------------------------------------------------------------

  public static add(a: Fixed, b: Fixed): Fixed {
    return (a + b) as Fixed;
  }

  public static sub(a: Fixed, b: Fixed): Fixed {
    return (a - b) as Fixed;
  }

  /**
   * Fixed Multiplikation:
   * (a * b) / SCALE
   *
   * Truncates toward zero. Deterministisch.
   */
  public static mul(a: Fixed, b: Fixed): Fixed {
    return ((a * b) / FixedMath.SCALE_RAW) as Fixed;
  }

  /**
   * Gerundete Fixed Multiplikation.
   * Nutze diese bewusst, nicht versehentlich.
   */
  public static mulRound(a: Fixed, b: Fixed): Fixed {
    const product = a * b;
    const half = FixedMath.SCALE_RAW / 2n;

    if (product >= 0n) {
      return ((product + half) / FixedMath.SCALE_RAW) as Fixed;
    }

    return ((product - half) / FixedMath.SCALE_RAW) as Fixed;
  }

  /**
   * Fixed Division:
   * (a * SCALE) / b
   */
  public static div(a: Fixed, b: Fixed): Fixed {
    if (b === 0n) {
      throw new Error("FixedMath.div division by zero");
    }

    return ((a * FixedMath.SCALE_RAW) / b) as Fixed;
  }

  public static divRound(a: Fixed, b: Fixed): Fixed {
    if (b === 0n) {
      throw new Error("FixedMath.divRound division by zero");
    }

    const numerator = a * FixedMath.SCALE_RAW;
    const half = FixedMath.absRaw(b) / 2n;

    if ((numerator >= 0n && b > 0n) || (numerator < 0n && b < 0n)) {
      return ((numerator + half) / b) as Fixed;
    }

    return ((numerator - half) / b) as Fixed;
  }

  public static mod(a: Fixed, b: Fixed): Fixed {
    if (b === 0n) {
      throw new Error("FixedMath.mod modulo by zero");
    }

    return (a % b) as Fixed;
  }

  public static neg(a: Fixed): Fixed {
    return (-a) as Fixed;
  }

  public static abs(a: Fixed): Fixed {
    return (a < 0n ? -a : a) as Fixed;
  }

  private static absRaw(a: bigint): bigint {
    return a < 0n ? -a : a;
  }

  public static min(a: Fixed, b: Fixed): Fixed {
    return a < b ? a : b;
  }

  public static max(a: Fixed, b: Fixed): Fixed {
    return a > b ? a : b;
  }

  public static clamp(value: Fixed, min: Fixed, max: Fixed): Fixed {
    if (min > max) {
      throw new Error("FixedMath.clamp min > max");
    }

    if (value < min) return min;
    if (value > max) return max;

    return value;
  }

  public static sign(value: Fixed): -1 | 0 | 1 {
    if (value < 0n) return -1;
    if (value > 0n) return 1;
    return 0;
  }

  public static equals(a: Fixed, b: Fixed, tolerance: Fixed = 1n as Fixed): boolean {
    if (tolerance < 0n) {
      throw new Error("FixedMath.equals negative tolerance");
    }

    return FixedMath.abs(a - b as Fixed) <= tolerance;
  }

  public static lt(a: Fixed, b: Fixed): boolean {
    return a < b;
  }

  public static lte(a: Fixed, b: Fixed): boolean {
    return a <= b;
  }

  public static gt(a: Fixed, b: Fixed): boolean {
    return a > b;
  }

  public static gte(a: Fixed, b: Fixed): boolean {
    return a >= b;
  }

  // ---------------------------------------------------------------------------
  // Deterministische Tick-Logik
  // ---------------------------------------------------------------------------

  /**
   * current + speedPerSecond * deltaSeconds
   */
  public static integrateLinear(
    current: Fixed,
    speedPerSecond: Fixed,
    deltaSeconds: Fixed
  ): Fixed {
    return FixedMath.add(current, FixedMath.mul(speedPerSecond, deltaSeconds));
  }

  /**
   * 10Hz Standard:
   * current + speedPerSecond * 0.1
   */
  public static integrateLinear10Hz(current: Fixed, speedPerSecond: Fixed): Fixed {
    return FixedMath.integrateLinear(current, speedPerSecond, FixedMath.DT_10HZ);
  }

  /**
   * Geschwindigkeit + Beschleunigung.
   */
  public static integrateVelocity(
    velocity: Fixed,
    accelerationPerSecond: Fixed,
    deltaSeconds: Fixed
  ): Fixed {
    return FixedMath.add(velocity, FixedMath.mul(accelerationPerSecond, deltaSeconds));
  }

  public static integrateVelocity10Hz(
    velocity: Fixed,
    accelerationPerSecond: Fixed
  ): Fixed {
    return FixedMath.integrateVelocity(
      velocity,
      accelerationPerSecond,
      FixedMath.DT_10HZ
    );
  }

  /**
   * Position mit Velocity + Acceleration:
   *
   * p2 = p + v*dt + 0.5*a*dt²
   */
  public static integratePosition(
    position: Fixed,
    velocityPerSecond: Fixed,
    accelerationPerSecond: Fixed,
    deltaSeconds: Fixed
  ): Fixed {
    const velocityDelta = FixedMath.mul(velocityPerSecond, deltaSeconds);
    const dtSquared = FixedMath.mul(deltaSeconds, deltaSeconds);
    const accelDelta = FixedMath.mul(FixedMath.mul(accelerationPerSecond, dtSquared), FixedMath.HALF);

    return FixedMath.add(position, FixedMath.add(velocityDelta, accelDelta));
  }

  public static integratePosition10Hz(
    position: Fixed,
    velocityPerSecond: Fixed,
    accelerationPerSecond: Fixed
  ): Fixed {
    return FixedMath.integratePosition(
      position,
      velocityPerSecond,
      accelerationPerSecond,
      FixedMath.DT_10HZ
    );
  }

  /**
   * Cooldown in Ticks statt Millisekunden.
   * Deterministisch, replaybar.
   */
  public static secondsToTicks(seconds: Fixed): TickIndex {
    if (seconds < 0n) {
      throw new Error("secondsToTicks got negative seconds");
    }

    const rawTicks = FixedMath.mulRound(seconds, FixedMath.fromInt(FixedMath.TICK_RATE));
    return (rawTicks / FixedMath.SCALE_RAW) as TickIndex;
  }

  public static ticksToSeconds(ticks: TickIndex): Fixed {
    return FixedMath.div(FixedMath.fromInt(ticks), FixedMath.fromInt(FixedMath.TICK_RATE));
  }

  public static hasTickReached(current: TickIndex, target: TickIndex): boolean {
    return current >= target;
  }

  public static addTicks(a: TickIndex, b: TickIndex): TickIndex {
    return (a + b) as TickIndex;
  }

  // ---------------------------------------------------------------------------
  // Kappa / Resonance / ARE-Hilfen
  // ---------------------------------------------------------------------------

  public static normalizeKappa(kappa: Fixed): Fixed {
    return FixedMath.clamp(kappa, FixedMath.KAPPA_MIN, FixedMath.KAPPA_MAX);
  }

  /**
   * Kappa wrappt zyklisch zwischen 0 und 1.
   * Gut für Ouroboros-Loop / zyklische Progression.
   */
  public static wrapKappa(kappa: Fixed): Fixed {
    const range = FixedMath.ONE;

    let value = kappa % range;

    if (value < 0n) {
      value += range;
    }

    return value as Fixed;
  }

  /**
   * Resonance hart begrenzen.
   * Beispiel: resonance 0..1000 als Fixed.
   */
  public static clampResonance(
    resonance: Fixed,
    min: Fixed = FixedMath.ZERO,
    max: Fixed = FixedMath.fromInt(1000)
  ): Fixed {
    return FixedMath.clamp(resonance, min, max);
  }

  /**
   * ARE-Kappa-Invarianz:
   * Erwartet z.B. kappaTotal == 1000.0
   */
  public static assertInvariant(
    label: string,
    actual: Fixed,
    expected: Fixed,
    tolerance: Fixed = FixedMath.fromRaw(0n)
  ): void {
    if (!FixedMath.equals(actual, expected, tolerance)) {
      throw new Error(
        `[InvariantViolation:${label}] expected=${FixedMath.toDecimalString(expected, 9)} actual=${FixedMath.toDecimalString(actual, 9)} tolerance=${FixedMath.toDecimalString(tolerance, 9)}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Interpolation, aber deterministisch
  // ---------------------------------------------------------------------------

  /**
   * Deterministisches LERP:
   * a + (b - a) * t
   *
   * t ist Fixed 0..1.
   */
  public static lerp(a: Fixed, b: Fixed, t: Fixed): Fixed {
    const nt = FixedMath.normalizeKappa(t);
    return FixedMath.add(a, FixedMath.mul(FixedMath.sub(b, a), nt));
  }

  /**
   * Bewegt value Richtung target mit maximalem fixed Schritt.
   */
  public static moveTowards(value: Fixed, target: Fixed, maxDelta: Fixed): Fixed {
    if (maxDelta < 0n) {
      throw new Error("moveTowards maxDelta must be non-negative");
    }

    const delta = FixedMath.sub(target, value);

    if (FixedMath.abs(delta) <= maxDelta) {
      return target;
    }

    return FixedMath.add(value, delta > 0n ? maxDelta : FixedMath.neg(maxDelta));
  }

  // ---------------------------------------------------------------------------
  // Vektoren
  // ---------------------------------------------------------------------------

  public static vec2(x: Fixed, y: Fixed): FixedVec2 {
    return Object.freeze({ x, y });
  }

  public static vec3(x: Fixed, y: Fixed, z: Fixed): FixedVec3 {
    return Object.freeze({ x, y, z });
  }

  public static vec2Add(a: FixedVec2, b: FixedVec2): FixedVec2 {
    return FixedMath.vec2(FixedMath.add(a.x, b.x), FixedMath.add(a.y, b.y));
  }

  public static vec2Sub(a: FixedVec2, b: FixedVec2): FixedVec2 {
    return FixedMath.vec2(FixedMath.sub(a.x, b.x), FixedMath.sub(a.y, b.y));
  }

  public static vec2MulScalar(v: FixedVec2, scalar: Fixed): FixedVec2 {
    return FixedMath.vec2(FixedMath.mul(v.x, scalar), FixedMath.mul(v.y, scalar));
  }

  public static vec2LengthSquared(v: FixedVec2): Fixed {
    return FixedMath.add(FixedMath.mul(v.x, v.x), FixedMath.mul(v.y, v.y));
  }

  /**
   * Distanzprüfung ohne sqrt.
   * Für MMO-Server fast immer besser:
   *
   * distanceSquared <= radiusSquared
   */
  public static vec2WithinRadius(a: FixedVec2, b: FixedVec2, radius: Fixed): boolean {
    if (radius < 0n) {
      throw new Error("vec2WithinRadius radius must be non-negative");
    }

    const delta = FixedMath.vec2Sub(a, b);
    const distSq = FixedMath.vec2LengthSquared(delta);
    const radiusSq = FixedMath.mul(radius, radius);

    return distSq <= radiusSq;
  }

  public static vec3Add(a: FixedVec3, b: FixedVec3): FixedVec3 {
    return FixedMath.vec3(
      FixedMath.add(a.x, b.x),
      FixedMath.add(a.y, b.y),
      FixedMath.add(a.z, b.z)
    );
  }

  public static vec3Sub(a: FixedVec3, b: FixedVec3): FixedVec3 {
    return FixedMath.vec3(
      FixedMath.sub(a.x, b.x),
      FixedMath.sub(a.y, b.y),
      FixedMath.sub(a.z, b.z)
    );
  }

  public static vec3MulScalar(v: FixedVec3, scalar: Fixed): FixedVec3 {
    return FixedMath.vec3(
      FixedMath.mul(v.x, scalar),
      FixedMath.mul(v.y, scalar),
      FixedMath.mul(v.z, scalar)
    );
  }

  public static vec3LengthSquared(v: FixedVec3): Fixed {
    return FixedMath.add(
      FixedMath.add(FixedMath.mul(v.x, v.x), FixedMath.mul(v.y, v.y)),
      FixedMath.mul(v.z, v.z)
    );
  }

  public static vec3WithinRadius(a: FixedVec3, b: FixedVec3, radius: Fixed): boolean {
    if (radius < 0n) {
      throw new Error("vec3WithinRadius radius must be non-negative");
    }

    const delta = FixedMath.vec3Sub(a, b);
    const distSq = FixedMath.vec3LengthSquared(delta);
    const radiusSq = FixedMath.mul(radius, radius);

    return distSq <= radiusSq;
  }

  public static integrateVec3Position10Hz(
    position: FixedVec3,
    velocityPerSecond: FixedVec3,
    accelerationPerSecond: FixedVec3
  ): FixedVec3 {
    return FixedMath.vec3(
      FixedMath.integratePosition10Hz(position.x, velocityPerSecond.x, accelerationPerSecond.x),
      FixedMath.integratePosition10Hz(position.y, velocityPerSecond.y, accelerationPerSecond.y),
      FixedMath.integratePosition10Hz(position.z, velocityPerSecond.z, accelerationPerSecond.z)
    );
  }

  public static integrateVec3Velocity10Hz(
    velocityPerSecond: FixedVec3,
    accelerationPerSecond: FixedVec3
  ): FixedVec3 {
    return FixedMath.vec3(
      FixedMath.integrateVelocity10Hz(velocityPerSecond.x, accelerationPerSecond.x),
      FixedMath.integrateVelocity10Hz(velocityPerSecond.y, accelerationPerSecond.y),
      FixedMath.integrateVelocity10Hz(velocityPerSecond.z, accelerationPerSecond.z)
    );
  }

  // ---------------------------------------------------------------------------
  // Grid / Chunk / World helpers
  // ---------------------------------------------------------------------------

  /**
   * Deterministisches Floor für Fixed.
   * Wichtig: BigInt / in JS truncatet Richtung 0.
   * Für negative Koordinaten brauchen wir echtes floor.
   */
  public static floorToInt(value: Fixed): bigint {
    const q = value / FixedMath.SCALE_RAW;
    const r = value % FixedMath.SCALE_RAW;

    if (value < 0n && r !== 0n) {
      return q - 1n;
    }

    return q;
  }

  public static ceilToInt(value: Fixed): bigint {
    const q = value / FixedMath.SCALE_RAW;
    const r = value % FixedMath.SCALE_RAW;

    if (value > 0n && r !== 0n) {
      return q + 1n;
    }

    return q;
  }

  public static roundToInt(value: Fixed): bigint {
    const half = FixedMath.HALF;

    if (value >= 0n) {
      return (value + half) / FixedMath.SCALE_RAW;
    }

    return (value - half) / FixedMath.SCALE_RAW;
  }

  public static worldToTile(value: Fixed, tileSize: Fixed): bigint {
    if (tileSize <= 0n) {
      throw new Error("worldToTile tileSize must be positive");
    }

    return FixedMath.floorToInt(FixedMath.div(value, tileSize));
  }

  public static worldToChunk(value: Fixed, chunkSizeTiles: bigint, tileSize: Fixed): bigint {
    if (chunkSizeTiles <= 0n) {
      throw new Error("worldToChunk chunkSizeTiles must be positive");
    }

    const tile = FixedMath.worldToTile(value, tileSize);

    if (tile >= 0n) {
      return tile / chunkSizeTiles;
    }

    return (tile - chunkSizeTiles + 1n) / chunkSizeTiles;
  }

  // ---------------------------------------------------------------------------
  // Safety / Validation
  // ---------------------------------------------------------------------------

  public static assertFiniteWorld(value: Fixed, label: string = "value"): void {
    if (value < -FixedMath.WORLD_LIMIT || value > FixedMath.WORLD_LIMIT) {
      throw new Error(
        `[WorldLimitViolation:${label}] value=${FixedMath.toDecimalString(value, 3)} limit=${FixedMath.toDecimalString(FixedMath.WORLD_LIMIT, 3)}`
      );
    }
  }

  public static assertVec3FiniteWorld(v: FixedVec3, label: string = "vec3"): void {
    FixedMath.assertFiniteWorld(v.x, `${label}.x`);
    FixedMath.assertFiniteWorld(v.y, `${label}.y`);
    FixedMath.assertFiniteWorld(v.z, `${label}.z`);
  }

  public static assertNonNegative(value: Fixed, label: string): void {
    if (value < 0n) {
      throw new Error(`[NegativeFixed:${label}] ${FixedMath.toDecimalString(value, 9)}`);
    }
  }

  public static assertRange(value: Fixed, bounds: FixedBounds, label: string): void {
    if (value < bounds.min || value > bounds.max) {
      throw new Error(
        `[FixedRangeViolation:${label}] value=${FixedMath.toDecimalString(value, 9)} min=${FixedMath.toDecimalString(bounds.min, 9)} max=${FixedMath.toDecimalString(bounds.max, 9)}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Deterministische Hash-Hilfe
  // ---------------------------------------------------------------------------

  /**
   * FNV-1a 64-bit für deterministische Checksums.
   * Gut für Replay-Vergleich, Snapshot-Fingerprints, Tick-Audits.
   */
  public static hashFixed(seed: bigint, value: Fixed): bigint {
    let hash = seed === 0n ? 0xcbf29ce484222325n : seed;
    const prime = 0x100000001b3n;

    let x = value;

    for (let i = 0; i < 8; i++) {
      const byte = Number((x >> BigInt(i * 8)) & 0xffn);
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * prime);
    }

    return hash;
  }

  public static hashVec3(seed: bigint, v: FixedVec3): bigint {
    let h = seed;
    h = FixedMath.hashFixed(h, v.x);
    h = FixedMath.hashFixed(h, v.y);
    h = FixedMath.hashFixed(h, v.z);
    return h;
  }
  }
